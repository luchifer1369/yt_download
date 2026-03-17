import express from "express";
import path from "path";
import fs from "fs";
import youtubedl from "youtube-dl-exec";

const app = express();
const __dirname = path.resolve();

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.post("/download", async (req, res) => {
  try {
    let { path: savePath, url, format } = req.body;

    if (!url || !format) {
      return res.json({ success: false, message: "Data tidak lengkap" });
    }

    // Default folder "downloads" jika user tidak isi path
    if (!savePath || savePath.trim() === "") {
      savePath = path.join(__dirname, "downloads");
    }

    // Pastikan folder tujuan ada
    if (!fs.existsSync(savePath)) {
      fs.mkdirSync(savePath, { recursive: true });
    }

    // Output file dengan judul video
    const outputFile = path.join(savePath, `%(title)s.%(ext)s`);

    // Jalankan yt-dlp
    await youtubedl(url, {
      output: outputFile,
      format: format === "mp3" ? "bestaudio" : "bestvideo+bestaudio",
      extractAudio: format === "mp3",
      audioFormat: format === "mp3" ? "mp3" : undefined,
      audioQuality: "192K",
      noPlaylist: true,
    });

    res.json({ success: true });
  } catch (error) {
    console.error("❌ ERROR:", error); // log detail di server
    res.json({
      success: false,
      message: error.message || "Terjadi kesalahan saat download",
    });
  }
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server berjalan di http://localhost:${PORT}`);
});
