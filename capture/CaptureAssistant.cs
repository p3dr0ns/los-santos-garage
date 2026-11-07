using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Sockets;
using System.Runtime.InteropServices;
using System.Security.Cryptography;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using System.Web.Script.Serialization;
using System.Windows.Forms;

// Compilado com o .NET Framework do Windows. Não carrega código no jogo.
public class CameraEvent { public int dx, dy, delay; }
public class CameraShot { public string id; public List<CameraEvent> events = new List<CameraEvent>(); }
public class CameraProfile { public int width, height; public List<CameraShot> shots = new List<CameraShot>(); }
public class CapturedPhoto { public string shot, data; }

public static class Native {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [StructLayout(LayoutKind.Sequential)] public struct RAWDEVICE { public ushort page, usage; public uint flags; public IntPtr target; }
    [StructLayout(LayoutKind.Sequential)] public struct RAWHEADER { public uint type, size; public IntPtr device, wParam; }
    [StructLayout(LayoutKind.Explicit)] public struct RAWMOUSE {
        [FieldOffset(0)] public ushort flags;
        [FieldOffset(4)] public uint buttons;
        [FieldOffset(12)] public int dx;
        [FieldOffset(16)] public int dy;
    }
    [StructLayout(LayoutKind.Sequential)] public struct MOUSEINPUT { public int dx, dy; public uint data, flags, time; public UIntPtr extra; }
    [StructLayout(LayoutKind.Sequential)] public struct INPUT { public uint type; public MOUSEINPUT mouse; }
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr window, int id);
    [DllImport("user32.dll")] public static extern bool RegisterRawInputDevices(RAWDEVICE[] devices, uint count, uint size);
    [DllImport("user32.dll")] public static extern uint GetRawInputData(IntPtr input, uint command, IntPtr data, ref uint size, uint headerSize);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool SetForegroundWindow(IntPtr window);
    [DllImport("user32.dll")] public static extern bool ShowWindow(IntPtr window, int command);
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out RECT rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr window, ref POINT point);
    [DllImport("user32.dll")] public static extern bool IsWindow(IntPtr window);
    [DllImport("user32.dll", SetLastError=true)] public static extern uint SendInput(uint count, INPUT[] input, int size);
}

public sealed class CaptureAssistant : Form {
    static readonly string[] Shots = { "front", "rear", "left", "right", "cinematicFront", "cinematicRear" };
    static readonly string[] Labels = { "Frente", "Traseira", "Lateral esquerda", "Lateral direita", "Cinematográfica dianteira", "Cinematográfica traseira" };
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 32000000 };
    readonly object sync = new object();
    readonly string root, storage, token;
    readonly string hostedUrl, hostedOrigin;
    readonly Label status = new Label();
    readonly Label instruction = new Label();
    readonly Button calibrate = new Button(), open = new Button(), reference = new Button();
    TcpListener listener;
    CameraProfile profile, draft;
    List<CameraEvent> events = new List<CameraEvent>();
    List<CapturedPhoto> photos = new List<CapturedPhoto>();
    Stopwatch recordingClock = new Stopwatch();
    IntPtr gameWindow;
    volatile bool recording, running, cancelled, closing;
    int checkpoint, progress;
    long previousEvent;
    string state = "idle", error = "";

    public CaptureAssistant(string projectRoot) {
        root = projectRoot;
        try {
            Uri address;
            string configuredUrl = File.ReadAllText(Path.Combine(root, "capture", "site-url.txt")).Trim();
            if (Uri.TryCreate(configuredUrl, UriKind.Absolute, out address) && address.Scheme == "https") {
                hostedUrl = address.AbsoluteUri; hostedOrigin = address.GetLeftPart(UriPartial.Authority);
            }
        } catch { }
        storage = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), "MinhaGaragemCapture");
        Directory.CreateDirectory(storage);
        byte[] secret = new byte[32]; using (var random = RandomNumberGenerator.Create()) random.GetBytes(secret);
        token = BitConverter.ToString(secret).Replace("-", "").ToLowerInvariant();
        LoadProfile();
        Text = "Minha Garagem · Assistente de captura";
        ClientSize = new Size(650, 470); MinimumSize = new Size(620, 470); StartPosition = FormStartPosition.CenterScreen;
        BackColor = Color.FromArgb(16, 23, 35); ForeColor = Color.FromArgb(226, 236, 251); Font = new Font("Segoe UI", 10);
        var title = new Label { Text = "Um estúdio para a sua coleção", Location = new Point(25, 23), Size = new Size(590, 34), Font = new Font("Segoe UI", 18, FontStyle.Bold) };
        instruction.SetBounds(26, 76, 595, 205);
        instruction.Text = "1. Deixe o GTA em janela sem bordas e selecione entrada de mouse Windows nas configurações.\n\n2. Estacione sempre na mesma vaga, com o carro parado e a mesma câmera inicial.\n\n3. Clique em Calibrar. No GTA, F6 inicia a gravação; mova somente a câmera com o mouse e use F7 para marcar cada uma das seis fotos.\n\nF9 interrompe imediatamente. Reproduzir o perfil exige o mesmo ponto inicial, resolução e sensibilidade.";
        status.SetBounds(26, 296, 595, 53); status.ForeColor = Color.LightSkyBlue;
        StyleButton(open, "Abrir organizador", 26, 365, 185);
        StyleButton(calibrate, "Calibrar câmeras", 224, 365, 185);
        StyleButton(reference, "Ver câmera inicial", 422, 365, 195);
        var note = new Label { Text = "Perfil experimental: confira o enquadramento antes de salvar o ensaio.", Location = new Point(26, 425), Size = new Size(595, 30), ForeColor = Color.FromArgb(144, 165, 195), Font = new Font("Segoe UI", 9) };
        Controls.AddRange(new Control[] { title, instruction, status, open, calibrate, reference, note });
        open.Click += delegate { Process.Start(new ProcessStartInfo((hostedUrl ?? new Uri(Path.Combine(root, "index.html")).AbsoluteUri) + "#capture=" + token) { UseShellExecute = true }); };
        calibrate.Click += delegate { if (running || recording) return; SetStatus("No GTA, deixe a câmera na posição inicial e pressione F6. Depois, F7 marca cada ângulo."); };
        reference.Click += delegate { string path = Path.Combine(storage, "reference.jpg"); if (File.Exists(path)) Process.Start(new ProcessStartInfo(path) { UseShellExecute = true }); else SetStatus("Calibre uma vez para guardar a câmera inicial."); };
        SetStatus(profile == null ? "Nenhum perfil calibrado. Calibre as seis câmeras para começar." : "Perfil de seis câmeras carregado. Abra o organizador para conectar.");
    }

    void StyleButton(Button button, string text, int x, int y, int width) {
        button.Text = text; button.SetBounds(x, y, width, 42); button.FlatStyle = FlatStyle.Flat;
        button.FlatAppearance.BorderColor = Color.FromArgb(66, 93, 133); button.BackColor = Color.FromArgb(31, 49, 77); button.ForeColor = ForeColor;
    }
    void SetStatus(string message) {
        if (closing || IsDisposed) return;
        if (InvokeRequired) { BeginInvoke((Action)(() => SetStatus(message))); return; }
        status.Text = message;
    }
    void LoadProfile() {
        try { profile = json.Deserialize<CameraProfile>(File.ReadAllText(Path.Combine(storage, "profile.json"))); ValidateProfile(profile); }
        catch { profile = null; }
    }
    static void ValidateProfile(CameraProfile value) {
        if (value == null || value.width < 640 || value.height < 360 || value.shots == null || value.shots.Count != 6) throw new InvalidDataException("Perfil incompleto.");
        for (int i = 0; i < 6; i++) {
            var shot = value.shots[i];
            if (shot.id != Shots[i] || shot.events == null || shot.events.Count > 120000) throw new InvalidDataException("Perfil inválido.");
            foreach (var step in shot.events) if (Math.Abs((long)step.dx) > 10000 || Math.Abs((long)step.dy) > 10000 || step.delay < 0 || step.delay > 10000) throw new InvalidDataException("Movimento inválido.");
            if (shot.events.Sum(step => (long)step.delay) > 120000) throw new InvalidDataException("Cada posição deve levar menos de dois minutos.");
        }
    }
    protected override void OnHandleCreated(EventArgs e) {
        base.OnHandleCreated(e);
        bool hotkeys = Native.RegisterHotKey(Handle, 6, 0x4000, (uint)Keys.F6);
        hotkeys &= Native.RegisterHotKey(Handle, 7, 0x4000, (uint)Keys.F7);
        hotkeys &= Native.RegisterHotKey(Handle, 9, 0x4000, (uint)Keys.F9);
        var raw = new Native.RAWDEVICE { page = 1, usage = 2, flags = 0x100, target = Handle };
        if (!Native.RegisterRawInputDevices(new[] { raw }, 1, (uint)Marshal.SizeOf(typeof(Native.RAWDEVICE))) || !hotkeys) SetStatus("Não foi possível registrar os atalhos. Feche outros assistentes de captura e reabra.");
        try {
            listener = new TcpListener(IPAddress.Loopback, 47831); listener.Start();
            Task.Run((Action)AcceptClients);
        } catch (Exception ex) { SetStatus("Não foi possível iniciar a conexão local: " + ex.Message); }
    }
    protected override void WndProc(ref Message message) {
        if (message.Msg == 0x0312) {
            int id = message.WParam.ToInt32();
            if (id == 9) { cancelled = true; recording = false; SetStatus("Captura/calibração interrompida. O perfil anterior foi mantido."); }
            if (id == 6) BeginCalibration();
            if (id == 7 && recording) MarkShot();
        }
        if (message.Msg == 0x00FF && recording) ReadMouse(message.LParam);
        base.WndProc(ref message);
    }
    static IntPtr FindGame() {
        foreach (var process in Process.GetProcesses()) {
            try {
                string name = process.ProcessName.ToLowerInvariant();
                if ((name == "gta5" || name == "gta5_enhanced" || name == "gtav" || name == "gta5 enhanced") && process.MainWindowHandle != IntPtr.Zero) return process.MainWindowHandle;
            } catch { }
            finally { process.Dispose(); }
        }
        return IntPtr.Zero;
    }
    static Rectangle ClientBounds(IntPtr window) {
        Native.RECT rect; var point = new Native.POINT();
        if (!Native.GetClientRect(window, out rect) || !Native.ClientToScreen(window, ref point)) throw new InvalidOperationException("Janela do GTA indisponível.");
        var bounds = new Rectangle(point.X, point.Y, rect.Right - rect.Left, rect.Bottom - rect.Top);
        if (bounds.Width < 640 || bounds.Height < 360 || !SystemInformation.VirtualScreen.Contains(bounds)) throw new InvalidOperationException("Deixe a janela do GTA visível e inteira na tela, em modo sem bordas.");
        return bounds;
    }
    void BeginCalibration() {
        if (running || recording) return;
        try {
            gameWindow = FindGame();
            if (gameWindow == IntPtr.Zero || Native.GetForegroundWindow() != gameWindow) throw new InvalidOperationException("Abra o GTA, deixe a câmera inicial pronta e pressione F6 dentro do jogo.");
            Rectangle bounds = ClientBounds(gameWindow);
            // O perfil anterior só é substituído ao concluir as seis posições.
            File.WriteAllBytes(Path.Combine(storage, "reference-draft.jpg"), CaptureJpeg(gameWindow));
            draft = new CameraProfile { width = bounds.Width, height = bounds.Height };
            events = new List<CameraEvent>(); checkpoint = 0; previousEvent = 0; cancelled = false;
            recordingClock.Restart(); recording = true;
            SetStatus("Gravando movimentos. Ajuste a câmera para FRENTE e pressione F7 (1/6).");
        } catch (Exception ex) { SetStatus(ex.Message); }
    }
    void ReadMouse(IntPtr input) {
        if (Native.GetForegroundWindow() != gameWindow) { recording = false; SetStatus("Calibração interrompida: o GTA perdeu o foco. Pressione F6 para reiniciar."); return; }
        uint size = 0, headerSize = (uint)Marshal.SizeOf(typeof(Native.RAWHEADER));
        Native.GetRawInputData(input, 0x10000003, IntPtr.Zero, ref size, headerSize);
        if (size == 0 || size > 4096) return;
        IntPtr buffer = Marshal.AllocHGlobal((int)size);
        try {
            if (Native.GetRawInputData(input, 0x10000003, buffer, ref size, headerSize) != size) return;
            var header = (Native.RAWHEADER)Marshal.PtrToStructure(buffer, typeof(Native.RAWHEADER));
            if (header.type != 0) return;
            var mouse = (Native.RAWMOUSE)Marshal.PtrToStructure(IntPtr.Add(buffer, (int)headerSize), typeof(Native.RAWMOUSE));
            if (mouse.flags != 0 || (mouse.dx == 0 && mouse.dy == 0)) return;
            long elapsed = recordingClock.ElapsedMilliseconds;
            if (elapsed > 120000 || events.Count >= 120000) { recording = false; SetStatus("Calibração longa demais. Reinicie com F6 e use movimentos curtos."); return; }
            events.Add(new CameraEvent { dx = mouse.dx, dy = mouse.dy, delay = (int)Math.Min(10000, elapsed - previousEvent) });
            previousEvent = elapsed;
        } finally { Marshal.FreeHGlobal(buffer); }
    }
    void MarkShot() {
        if (Native.GetForegroundWindow() != gameWindow) return;
        draft.shots.Add(new CameraShot { id = Shots[checkpoint], events = new List<CameraEvent>(events) });
        checkpoint++; events.Clear(); previousEvent = 0; recordingClock.Restart();
        if (checkpoint < 6) { SetStatus("Posição salva. Ajuste para " + Labels[checkpoint] + " e pressione F7 (" + (checkpoint + 1) + "/6)."); return; }
        recording = false;
        try {
            ValidateProfile(draft);
            string temporary = Path.Combine(storage, "profile-draft.json");
            File.WriteAllText(temporary, json.Serialize(draft), Encoding.UTF8);
            string destination = Path.Combine(storage, "profile.json");
            if (File.Exists(destination)) File.Replace(temporary, destination, null); else File.Move(temporary, destination);
            File.Copy(Path.Combine(storage, "reference-draft.jpg"), Path.Combine(storage, "reference.jpg"), true);
            profile = draft;
            SetStatus("Seis câmeras calibradas. Volte à câmera INICIAL e inicie o ensaio pelo organizador.");
        } catch (Exception ex) { SetStatus("Não foi possível salvar o perfil: " + ex.Message); }
    }
    string StartCapture() {
        if (running || recording) return "Já há uma captura ou calibração em andamento.";
        if (profile == null) return "Calibre as seis câmeras com F6/F7 antes de capturar.";
        var window = FindGame();
        if (window == IntPtr.Zero) return "O GTA não está aberto. Abra o jogo e deixe o carro na vaga de captura.";
        try {
            var bounds = ClientBounds(window);
            if (bounds.Width != profile.width || bounds.Height != profile.height) return "A resolução mudou. Use a resolução da calibração ou calibre novamente.";
        } catch (Exception ex) { return ex.Message; }
        gameWindow = window; cancelled = false; running = true;
        lock (sync) { state = "running"; error = ""; progress = 0; photos = new List<CapturedPhoto>(); }
        calibrate.Enabled = false;
        Task.Run((Action)RunCapture);
        return null;
    }
    void EnsureGame() {
        if (cancelled || closing) throw new OperationCanceledException("Captura cancelada com F9.");
        if (!Native.IsWindow(gameWindow) || Native.GetForegroundWindow() != gameWindow) throw new InvalidOperationException("O GTA perdeu o foco. A captura foi interrompida.");
        var bounds = ClientBounds(gameWindow);
        if (bounds.Width != profile.width || bounds.Height != profile.height) throw new InvalidOperationException("A resolução mudou durante a captura.");
    }
    void WaitInGame(int milliseconds) {
        for (int left = milliseconds; left > 0; left -= 20) { EnsureGame(); Thread.Sleep(Math.Min(20, left)); }
    }
    void RunCapture() {
        try {
            SetStatus("Preparando ensaio. F9 interrompe. Deixe o mouse parado.");
            Native.ShowWindow(gameWindow, 9); Native.SetForegroundWindow(gameWindow);
            Thread.Sleep(800); EnsureGame(); WaitInGame(1800);
            var result = new List<CapturedPhoto>();
            foreach (var shot in profile.shots) {
                foreach (var movement in shot.events) {
                    WaitInGame(movement.delay);
                    EnsureGame();
                    var input = new Native.INPUT { type = 0, mouse = new Native.MOUSEINPUT { dx = movement.dx, dy = movement.dy, flags = 0x0001 | 0x2000 } };
                    if (Native.SendInput(1, new[] { input }, Marshal.SizeOf(typeof(Native.INPUT))) != 1) throw new InvalidOperationException("O Windows não aceitou o movimento de câmera. Verifique se jogo e assistente estão no mesmo nível de permissão.");
                }
                WaitInGame(1200);
                result.Add(new CapturedPhoto { shot = shot.id, data = Convert.ToBase64String(CaptureJpeg(gameWindow)) });
                lock (sync) progress = result.Count;
                SetStatus("Fotografando " + result.Count + "/6. F9 interrompe.");
            }
            lock (sync) { photos = result; state = "complete"; }
            SetStatus("Ensaio concluído. Confira e salve as seis fotos no organizador.");
        } catch (Exception ex) {
            lock (sync) { state = cancelled ? "cancelled" : "error"; error = ex.Message; photos.Clear(); }
            SetStatus(ex.Message);
        } finally {
            running = false;
            if (!closing && IsHandleCreated) BeginInvoke((Action)(() => calibrate.Enabled = true));
        }
    }
    static byte[] CaptureJpeg(IntPtr window) {
        var bounds = ClientBounds(window);
        using (var bitmap = new Bitmap(bounds.Width, bounds.Height)) {
            using (var graphics = Graphics.FromImage(bitmap)) graphics.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size, CopyPixelOperation.SourceCopy);
            int width = Math.Min(1600, bitmap.Width), height = (int)Math.Round(bitmap.Height * (double)width / bitmap.Width);
            using (var resized = new Bitmap(bitmap, width, height)) using (var stream = new MemoryStream()) {
                var encoder = ImageCodecInfo.GetImageEncoders().First(info => info.MimeType == "image/jpeg");
                using (var parameters = new EncoderParameters(1)) { parameters.Param[0] = new EncoderParameter(System.Drawing.Imaging.Encoder.Quality, 88L); resized.Save(stream, encoder, parameters); }
                return stream.ToArray();
            }
        }
    }
    void AcceptClients() {
        while (!closing) {
            try { var client = listener.AcceptTcpClient(); Task.Run(() => HandleClient(client)); }
            catch { if (closing) return; }
        }
    }
    void HandleClient(TcpClient client) {
        using (client) {
            client.ReceiveTimeout = 3000; client.SendTimeout = 10000;
            try {
                var stream = client.GetStream();
                var reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true);
                string first = reader.ReadLine();
                if (first == null || first.Length > 2000) return;
                string[] parts = first.Split(' ');
                if (parts.Length != 3) return;
                var headers = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
                int length = first.Length;
                for (string line = reader.ReadLine(); !String.IsNullOrEmpty(line); line = reader.ReadLine()) {
                    length += line.Length; if (length > 16000) return;
                    int split = line.IndexOf(':'); if (split > 0) headers[line.Substring(0, split)] = line.Substring(split + 1).Trim();
                }
                string origin;
                if (headers.TryGetValue("Origin", out origin) && origin != "null" && origin != hostedOrigin) { Reply(stream, 403, new { error = "Origem não autorizada." }, false); return; }
                origin = origin ?? "null";
                string host;
                if (!headers.TryGetValue("Host", out host) || host != "127.0.0.1:47831") { Reply(stream, 403, new { error = "Endereço não autorizado." }, false); return; }
                if (parts[0] == "OPTIONS") { Reply(stream, 200, new { ok = true }, true, origin); return; }
                string submitted;
                if (!headers.TryGetValue("X-Capture-Token", out submitted) || submitted != token) { Reply(stream, 401, new { error = "Abra o organizador pelo botão do assistente para conectar." }, true, origin); return; }
                object response; int code = 200;
                if (parts[0] == "GET" && parts[1] == "/health") response = new { version = 1, calibrated = profile != null };
                else if (parts[0] == "GET" && parts[1] == "/status") { lock (sync) response = new { state, error, progress }; }
                else if (parts[0] == "GET" && parts[1] == "/photos") { lock (sync) { if (state != "complete") { code = 409; response = new { error = "Nenhum ensaio concluído." }; } else response = new { photos = photos.ToArray() }; } }
                else if (parts[0] == "POST" && parts[1] == "/capture") { string failure = (string)Invoke((Func<string>)StartCapture); if (failure != null) { code = 409; response = new { error = failure }; } else response = new { started = true }; }
                else if (parts[0] == "POST" && parts[1] == "/cancel") { cancelled = true; response = new { cancelled = true }; }
                else { code = 404; response = new { error = "Operação não encontrada." }; }
                Reply(stream, code, response, true, origin);
            } catch { /* Conexões interrompidas não alteram o estado da captura. */ }
        }
    }
    void Reply(NetworkStream stream, int code, object response, bool cors, string origin = "null") {
        string body; lock (json) body = json.Serialize(response);
        byte[] bytes = Encoding.UTF8.GetBytes(body);
        string headers = "HTTP/1.1 " + code + " Result\r\nContent-Type: application/json; charset=utf-8\r\nContent-Length: " + bytes.Length + "\r\nConnection: close\r\nCache-Control: no-store\r\n";
        if (cors) headers += "Access-Control-Allow-Origin: " + origin + "\r\nVary: Origin\r\nAccess-Control-Allow-Methods: GET, POST, OPTIONS\r\nAccess-Control-Allow-Headers: X-Capture-Token, Content-Type\r\nAccess-Control-Allow-Private-Network: true\r\n";
        byte[] headerBytes = Encoding.ASCII.GetBytes(headers + "\r\n"); stream.Write(headerBytes, 0, headerBytes.Length); stream.Write(bytes, 0, bytes.Length);
    }
    protected override void OnFormClosed(FormClosedEventArgs e) {
        closing = true; cancelled = true;
        if (listener != null) listener.Stop();
        foreach (int key in new[] { 6, 7, 9 }) Native.UnregisterHotKey(Handle, key);
        base.OnFormClosed(e);
    }
    public static int SelfTest() {
        var value = new CameraProfile { width = 1920, height = 1080 };
        foreach (string shot in Shots) value.shots.Add(new CameraShot { id = shot, events = new List<CameraEvent> { new CameraEvent { dx = 12, dy = -3, delay = 10 } } });
        ValidateProfile(value);
        var serializer = new JavaScriptSerializer();
        ValidateProfile(serializer.Deserialize<CameraProfile>(serializer.Serialize(value)));
        value.shots.RemoveAt(0);
        try { ValidateProfile(value); return 2; } catch (InvalidDataException) { }
        if (Marshal.SizeOf(typeof(Native.INPUT)) != (IntPtr.Size == 8 ? 40 : 28)) return 3;
        Console.WriteLine("PASS: perfil de seis câmeras, serialização, rejeição de perfil incompleto e estrutura Win32.");
        return 0;
    }
    [STAThread] public static int Main(string[] args) {
        if (args.Contains("--self-test")) return SelfTest();
        Native.SetProcessDPIAware(); Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        string projectRoot = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
        using (var mutex = new Mutex(false, "Local\\MinhaGaragemCaptureAssistant")) {
            if (!mutex.WaitOne(0)) { MessageBox.Show("O assistente de captura já está aberto."); return 1; }
            try { Application.Run(new CaptureAssistant(projectRoot)); } finally { mutex.ReleaseMutex(); }
        }
        return 0;
    }
}
