import express from "express";
import path from "path";
import fs from "fs";
import youtubedl from "youtube-dl-exec";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);
const __dirname = path.resolve();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/download", async (req, res) => {
  try {
    let { path: userPath, url } = req.body;

    // Menentukan lokasi penyimpanan
    let finalSavePath =
      userPath && userPath.trim() !== ""
        ? path.normalize(userPath)
        : path.join(__dirname, "downloads");

    if (!fs.existsSync(finalSavePath)) {
      fs.mkdirSync(finalSavePath, { recursive: true });
    }

    const outputFile = path.join(finalSavePath, `%(title)s.%(ext)s`);

    // Konfigurasi khusus untuk MP3 saja
    const dlOptions = {
      output: outputFile,
      noPlaylist: true,
      noCheckCertificates: true,
      addHeader: [
        "referer:https://www.google.com/",
        "user-agent:Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      ],
      format: "bestaudio/best",
      extractAudio: true,
      audioFormat: "mp3",
    };

    const child = youtubedl.exec(url, dlOptions);

    child.stdout.on("data", (data) => {
      const output = data.toString();
      const match = output.match(/(\d+\.\d+)%/);
      if (match) {
        io.emit("downloadProgress", { progress: match[1] });
      }
    });

    child.on("error", (err) => {
      console.error("Child Process Error:", err);
    });

    await child;
    res.json({ success: true });
  } catch (error) {
    console.error("❌ DETAIL ERROR:", error);
    res.json({
      success: false,
      message: "Gagal: Periksa koneksi atau link YouTube",
    });
  }
});

const PORT = 3000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Sistem Aktif di http://localhost:${PORT}`);
});
