using System;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Text;
using System.Threading;
using System.Windows.Forms;

internal static class HgcCalculatorLauncher
{
    private const int Port = 8765;
    private static readonly string Root = AppDomain.CurrentDomain.BaseDirectory;

    [STAThread]
    private static void Main()
    {
        string indexPath = Path.Combine(Root, "index.html");
        if (!File.Exists(indexPath))
        {
            MessageBox.Show(
                "Zet HGC Calculator.exe in dezelfde map als index.html.",
                "HGC Calculator",
                MessageBoxButtons.OK,
                MessageBoxIcon.Error);
            return;
        }

        TcpListener listener = new TcpListener(IPAddress.Loopback, Port);
        try
        {
            listener.Start();
        }
        catch (SocketException)
        {
            OpenBrowser();
            return;
        }

        OpenBrowser();

        while (true)
        {
            try
            {
                TcpClient client = listener.AcceptTcpClient();
                ThreadPool.QueueUserWorkItem(delegate { Serve(client); });
            }
            catch
            {
                listener.Stop();
                return;
            }
        }
    }

    private static void OpenBrowser()
    {
        try
        {
            Process.Start(new ProcessStartInfo("http://127.0.0.1:" + Port)
            {
                UseShellExecute = true
            });
        }
        catch
        {
            // De server blijft beschikbaar als Windows het automatisch openen
            // van de standaardbrowser blokkeert.
        }
    }

    private static void Serve(TcpClient client)
    {
        using (client)
        using (NetworkStream stream = client.GetStream())
        using (StreamReader reader = new StreamReader(stream, Encoding.ASCII, false, 1024, true))
        {
            string requestLine = reader.ReadLine();
            if (String.IsNullOrWhiteSpace(requestLine)) return;

            string header;
            while (!String.IsNullOrEmpty(header = reader.ReadLine())) { }

            string[] parts = requestLine.Split(' ');
            string requestPath = parts.Length > 1 ? parts[1] : "/";
            int queryIndex = requestPath.IndexOf('?');
            if (queryIndex >= 0) requestPath = requestPath.Substring(0, queryIndex);
            requestPath = Uri.UnescapeDataString(requestPath);
            if (requestPath == "/") requestPath = "/index.html";

            string relativePath = requestPath.TrimStart('/').Replace('/', Path.DirectorySeparatorChar);
            string fullPath = Path.GetFullPath(Path.Combine(Root, relativePath));
            string safeRoot = Path.GetFullPath(Root).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;

            if (!fullPath.StartsWith(safeRoot, StringComparison.OrdinalIgnoreCase) || !File.Exists(fullPath))
            {
                WriteResponse(stream, "404 Not Found", "text/plain; charset=utf-8", Encoding.UTF8.GetBytes("Niet gevonden"));
                return;
            }

            byte[] content = File.ReadAllBytes(fullPath);
            WriteResponse(stream, "200 OK", MimeType(Path.GetExtension(fullPath)), content);
        }
    }

    private static void WriteResponse(Stream stream, string status, string mimeType, byte[] content)
    {
        string headers = "HTTP/1.1 " + status + "\r\n" +
                         "Content-Type: " + mimeType + "\r\n" +
                         "Content-Length: " + content.Length + "\r\n" +
                         "Connection: close\r\n\r\n";
        byte[] headerBytes = Encoding.ASCII.GetBytes(headers);
        stream.Write(headerBytes, 0, headerBytes.Length);
        stream.Write(content, 0, content.Length);
    }

    private static string MimeType(string extension)
    {
        switch (extension.ToLowerInvariant())
        {
            case ".html": return "text/html; charset=utf-8";
            case ".css": return "text/css; charset=utf-8";
            case ".js": return "text/javascript; charset=utf-8";
            case ".svg": return "image/svg+xml";
            case ".png": return "image/png";
            case ".jpg":
            case ".jpeg": return "image/jpeg";
            default: return "application/octet-stream";
        }
    }
}
