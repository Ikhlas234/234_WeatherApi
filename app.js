require("dotenv").config();

const express = require("express");
const axios = require("axios");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

// Mengambil nama komponen alamat (negara, provinsi, dst) dari hasil MapTiler
function cariKomponen(feature, daftarTipe) {
    const semua = [
        { id: feature.id || "", text: feature.text || "" },
        ...(feature.context || []),
    ];
    for (const tipe of daftarTipe) {
        const ketemu = semua.find(
            (item) => item.id && item.id.split(".")[0] === tipe
        );
        if (ketemu && ketemu.text) return ketemu.text;
    }
    return "-";
}

app.get("/api/lokasi", async (req, res) => {
    const kota = req.query.q || "Bandung City";
    const apiKey = process.env.MAPTILER_API_KEY;
    const baseUrl = process.env.MAPTILER_BASE_URL;

    const url = `${baseUrl}/${encodeURIComponent(kota)}.json?key=${apiKey}`;

    try {
        const response = await axios.get(url);
        const data = response.data;

        if (!data.features || data.features.length === 0) {
            return res.status(404).json({ error: "Lokasi tidak ditemukan." });
        }

        const lokasi = data.features[0].matching_text || data.features[0].text;
        const koordinat = data.features[0].geometry.coordinates;

        res.json({
            kota: lokasi,
            koordinat: koordinat,
            negara: cariKomponen(data.features[0], ["country"]),
            provinsi: cariKomponen(data.features[0], ["region", "subregion"]),
            kecamatan: cariKomponen(data.features[0], [
                "county",
                "municipal_district",
                "municipality",
                "joint_municipality",
                "locality",
                "neighbourhood",
            ]),
            longitude: koordinat[0],
            latitude: koordinat[1],
        });
    } catch (error) {
        console.error(error.message);
        res.status(500).json({ error: "Gagal mengambil data dari MapTiler." });
    }
});

app.listen(PORT, () => {
    console.log(`Server berjalan di http://localhost:${PORT}`);
});