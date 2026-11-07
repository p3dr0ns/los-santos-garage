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

public class CapturedPhoto { public long id; public string session, data; }
public static class Native {
    [StructLayout(LayoutKind.Sequential)] public struct RECT { public int Left, Top, Right, Bottom; }
    [StructLayout(LayoutKind.Sequential)] public struct POINT { public int X, Y; }
    [DllImport("user32.dll")] public static extern bool SetProcessDPIAware();
    [DllImport("user32.dll")] public static extern bool RegisterHotKey(IntPtr window, int id, uint modifiers, uint key);
    [DllImport("user32.dll")] public static extern bool UnregisterHotKey(IntPtr window, int id);
    [DllImport("user32.dll")] public static extern IntPtr GetForegroundWindow();
    [DllImport("user32.dll")] public static extern bool GetClientRect(IntPtr window, out RECT rect);
    [DllImport("user32.dll")] public static extern bool ClientToScreen(IntPtr window, ref POINT point);
    [DllImport("user32.dll")] public static extern bool IsIconic(IntPtr window);
}
// Captures the visible GTA window only after F8; never sends input to the game.
public sealed class CaptureAssistant : Form {
    readonly JavaScriptSerializer json = new JavaScriptSerializer { MaxJsonLength = 64000000 };
    readonly object sync = new object();
    readonly string token, siteUrl, hostedOrigin;
    readonly Label status = new Label();
    readonly List<CapturedPhoto> photos = new List<CapturedPhoto>();
    TcpListener listener;
    volatile bool closing;
    bool enabled, takingPhoto;
    string session = "", error = "";
    long sequence;
    DateTime lastSiteContact = DateTime.MinValue;
    int servicePort = 47831;
    readonly bool validationMode;
    public CaptureAssistant(string root, bool validate = false) {
        validationMode = validate;
        siteUrl = "https://p3dr0ns.github.io/organizador-garagem-gta-v/";
        string config = Path.Combine(root, "capture", "site-url.txt");
        Uri configured;
        if (File.Exists(config) && Uri.TryCreate(File.ReadAllText(config).Trim(), UriKind.Absolute, out configured) && configured.Scheme == "https") siteUrl = configured.AbsoluteUri;
        hostedOrigin = new Uri(siteUrl).GetLeftPart(UriPartial.Authority);
        byte[] bytes = new byte[32]; using (var random = RandomNumberGenerator.Create()) random.GetBytes(bytes);
        token = BitConverter.ToString(bytes).Replace("-", "").ToLowerInvariant();
        Text = "Minha Garagem · Enviar prints";
        ClientSize = new Size(620, 330); FormBorderStyle = FormBorderStyle.FixedDialog; MaximizeBox = false;
        BackColor = Color.FromArgb(16, 23, 35); ForeColor = Color.White; Font = new Font("Segoe UI", 10);
        var title = new Label { Text = "Um print. Direto para o seu carro.", Location = new Point(24, 24), Size = new Size(575, 38), Font = new Font("Segoe UI", 17, FontStyle.Bold) };
        var help = new Label { Text = "1. Abra o site pelo botão abaixo e escolha o carro.\n2. Em Fotos do meu carro, ative Receber prints.\n3. No GTA em janela sem bordas, enquadre a foto e pressione F8.\n\nCada print é salvo no site. F9 pausa. Nenhuma calibração é necessária.", Location = new Point(26, 80), Size = new Size(565, 135) };
        var open = new Button { Text = "Abrir site e conectar", Location = new Point(26, 228), Size = new Size(250, 40), FlatStyle = FlatStyle.Flat };
        open.Click += delegate { Process.Start(new ProcessStartInfo(siteUrl + "#capture=" + token) { UseShellExecute = true }); };
        status.SetBounds(26, 282, 565, 40); status.ForeColor = Color.LightSkyBlue;
        status.Text = "Abra o site para escolher o carro que receberá os prints.";
        Controls.AddRange(new Control[] { title, help, open, status });
    }
    void SetStatus(string message) {
        if (closing || IsDisposed) return;
        if (InvokeRequired) { BeginInvoke((Action)(() => SetStatus(message))); return; }
        status.Text = message;
    }
    protected override void OnHandleCreated(EventArgs e) {
        base.OnHandleCreated(e);
        if (validationMode) return;
        if (!Native.RegisterHotKey(Handle, 8, 0x4000, (uint)Keys.F8) || !Native.RegisterHotKey(Handle, 9, 0x4000, (uint)Keys.F9)) SetStatus("F8/F9 indisponíveis. Feche outros assistentes e reabra.");
        try { listener = new TcpListener(IPAddress.Loopback, servicePort); listener.Start(); Task.Run((Action)AcceptClients); }
        catch (Exception ex) { SetStatus("Não foi possível conectar: " + ex.Message); }
    }
    protected override void WndProc(ref Message message) {
        if (message.Msg == 0x0312 && message.WParam.ToInt32() == 8) TakeScreenshot();
        if (message.Msg == 0x0312 && message.WParam.ToInt32() == 9) CancelCapture();
        base.WndProc(ref message);
    }
    static IntPtr FindGame() {
        foreach (var process in Process.GetProcesses()) {
            try {
                string name = process.ProcessName.ToLowerInvariant();
                if ((name == "gta5" || name == "gta5_enhanced" || name == "gtav" || name == "gta5 enhanced") && process.MainWindowHandle != IntPtr.Zero && process.MainWindowHandle == Native.GetForegroundWindow()) return process.MainWindowHandle;
            } catch { } finally { process.Dispose(); }
        }
        return IntPtr.Zero;
    }
    static byte[] CapturePng(IntPtr window) {
        Native.RECT rect; var point = new Native.POINT();
        if (Native.IsIconic(window) || !Native.GetClientRect(window, out rect) || !Native.ClientToScreen(window, ref point)) throw new InvalidOperationException("Restaure a janela do GTA antes do print.");
        var bounds = new Rectangle(point.X, point.Y, rect.Right - rect.Left, rect.Bottom - rect.Top);
        if (bounds.Width < 640 || bounds.Height < 360 || !SystemInformation.VirtualScreen.Contains(bounds)) throw new InvalidOperationException("Use o GTA em janela sem bordas e visível na tela.");
        using (var bitmap = new Bitmap(bounds.Width, bounds.Height)) {
            using (var graphics = Graphics.FromImage(bitmap)) graphics.CopyFromScreen(bounds.Location, Point.Empty, bounds.Size, CopyPixelOperation.SourceCopy);
            if (Native.GetForegroundWindow() != window) throw new InvalidOperationException("O GTA perdeu o foco. Tire outro print.");
            double scale = Math.Min(1.0, 2560.0 / Math.Max(bounds.Width, bounds.Height));
            using (var resized = new Bitmap(bitmap, Math.Max(1, (int)(bounds.Width * scale)), Math.Max(1, (int)(bounds.Height * scale))))
            using (var stream = new MemoryStream()) { resized.Save(stream, ImageFormat.Png); return stream.ToArray(); }
        }
    }
    void TakeScreenshot() {
        string target;
        lock (sync) {
            if (!enabled || takingPhoto) return;
            if ((DateTime.UtcNow - lastSiteContact).TotalSeconds > 90) { enabled = false; error = "O site ficou sem contato. Reconecte para continuar."; return; }
            if (photos.Count >= 6) { error = "Aguardando o site receber os prints anteriores."; return; }
            takingPhoto = true; target = session;
        }
        var window = FindGame();
        Task.Run(() => {
            try {
                if (window == IntPtr.Zero) throw new InvalidOperationException("Deixe o GTA em primeiro plano para usar F8.");
                string data = Convert.ToBase64String(CapturePng(window));
                lock (sync) { if (enabled && target == session) { photos.Add(new CapturedPhoto { id = ++sequence, session = target, data = data }); error = ""; } }
                SetStatus("Print capturado. O site recebe e salva a foto no carro escolhido.");
            } catch (Exception ex) { lock (sync) error = ex.Message; SetStatus(ex.Message); }
            finally { lock (sync) takingPhoto = false; }
        });
    }
    string ArmCapture() {
        lock (sync) { if (enabled) throw new InvalidOperationException("Outra aba já recebe prints. Pause nela ou pressione F9 antes de reconectar."); enabled = true; session = Guid.NewGuid().ToString("N"); photos.Clear(); error = ""; return session; }
    }
    void CancelCapture() { lock (sync) { enabled = false; photos.Clear(); } SetStatus("Envio pausado. Ative Receber prints no carro desejado para continuar."); }
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
                if (!headers.TryGetValue("Host", out host) || host != "127.0.0.1:" + servicePort) { Reply(stream, 403, new { error = "Endereço não autorizado." }, false); return; }
                if (parts[0] == "OPTIONS") { Reply(stream, 200, new { ok = true }, true, origin); return; }
                string submitted;
                if (!headers.TryGetValue("X-Capture-Token", out submitted) || submitted != token) { Reply(stream, 401, new { error = "Abra o organizador pelo botão do assistente para conectar." }, true, origin); return; }
                lock (sync) lastSiteContact = DateTime.UtcNow;
                object response; int code = 200;
                if (parts[0] == "GET" && parts[1] == "/health") response = new { version = 3, manualCapture = true };
                else if (parts[0] == "GET" && parts[1] == "/photos") { lock (sync) response = new { enabled, session, error, photos = photos.Take(1).ToArray() }; }
                else if (parts[0] == "POST" && parts[1] == "/arm") { try { response = new { session = ArmCapture() }; } catch (Exception ex) { code = 409; response = new { error = ex.Message }; } }
                else if (parts[0] == "POST" && parts[1].StartsWith("/ack/")) { long id; if (!Int64.TryParse(parts[1].Substring(5), out id)) { code = 400; response = new { error = "Print inválido." }; } else { lock (sync) photos.RemoveAll(photo => photo.id == id); response = new { ok = true }; } }
                else if (parts[0] == "POST" && parts[1] == "/cancel") { CancelCapture(); response = new { cancelled = true }; }
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
        closing = true; lock (sync) enabled = false;
        if (listener != null) listener.Stop();
        if (!validationMode) { Native.UnregisterHotKey(Handle, 8); Native.UnregisterHotKey(Handle, 9); }
        base.OnFormClosed(e);
    }
    [STAThread] public static int Main(string[] args) {
        if (args.Contains("--self-test")) return SelfTest();
        Native.SetProcessDPIAware(); Application.EnableVisualStyles(); Application.SetCompatibleTextRenderingDefault(false);
        string root = Path.GetFullPath(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, ".."));
        using (var mutex = new Mutex(false, "Local\\MinhaGaragemCaptureAssistant")) {
            if (!mutex.WaitOne(0)) { MessageBox.Show("O assistente já está aberto. Feche a versão anterior para atualizar."); return 1; }
            try { Application.Run(new CaptureAssistant(root)); } finally { mutex.ReleaseMutex(); }
        }
        return 0;
    }
    static string TestRequest(CaptureAssistant assistant, string method, string path, string secret, string origin, string host = null) {
        using (var client = new TcpClient()) {
            client.Connect(IPAddress.Loopback, assistant.servicePort); client.ReceiveTimeout = 3000;
            var stream = client.GetStream();
            string request = method + " " + path + " HTTP/1.1\r\nHost: " + (host ?? "127.0.0.1:" + assistant.servicePort) + "\r\nOrigin: " + origin + "\r\nX-Capture-Token: " + secret + "\r\nContent-Length: 0\r\n\r\n";
            byte[] bytes = Encoding.ASCII.GetBytes(request); stream.Write(bytes, 0, bytes.Length);
            return new StreamReader(stream).ReadToEnd();
        }
    }
    public static int SelfTest() {
        using (var assistant = new CaptureAssistant(Path.GetTempPath(), true)) {
            var handle = assistant.Handle;
            assistant.listener = new TcpListener(IPAddress.Loopback, 0); assistant.listener.Start();
            assistant.servicePort = ((IPEndPoint)assistant.listener.LocalEndpoint).Port;
            Task.Run((Action)assistant.AcceptClients);
            try {
                if (!TestRequest(assistant, "GET", "/health", "", "null").StartsWith("HTTP/1.1 401")) return 1;
                if (!TestRequest(assistant, "GET", "/health", assistant.token, "https://untrusted.example").StartsWith("HTTP/1.1 403")) return 2;
                if (!TestRequest(assistant, "GET", "/health", assistant.token, "null", "untrusted.example").StartsWith("HTTP/1.1 403")) return 3;
                if (!TestRequest(assistant, "OPTIONS", "/arm", "", assistant.hostedOrigin).Contains("Access-Control-Allow-Private-Network: true")) return 4;
                if (!TestRequest(assistant, "GET", "/health", assistant.token, assistant.hostedOrigin).Contains("\"manualCapture\":true")) return 5;
                if (!TestRequest(assistant, "POST", "/arm", assistant.token, "null").StartsWith("HTTP/1.1 200") || !assistant.enabled) return 6;
                if (!TestRequest(assistant, "POST", "/arm", assistant.token, "null").StartsWith("HTTP/1.1 409")) return 7;
                lock (assistant.sync) assistant.photos.Add(new CapturedPhoto { id = 1, session = assistant.session, data = "test" });
                if (!TestRequest(assistant, "GET", "/photos", assistant.token, "null").Contains("\"id\":1")) return 8;
                TestRequest(assistant, "POST", "/ack/1", assistant.token, "null");
                if (assistant.photos.Count != 0) return 9;
                TestRequest(assistant, "POST", "/cancel", assistant.token, "null");
                if (assistant.enabled) return 10;
                if (!TestRequest(assistant, "POST", "/capture", assistant.token, "null").StartsWith("HTTP/1.1 404")) return 11;
                return 0;
            } finally { assistant.closing = true; assistant.listener.Stop(); }
        }
    }
}
