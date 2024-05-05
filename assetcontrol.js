const AdmZip = require('adm-zip');
const { downloadFromSupabase } = require('./supabase')
const fs = require('fs');

async function getAssetsInMemory(fileName){
    const data = await downloadFromSupabase(fileName);
    const buffer = await data.arrayBuffer();
    // const fileArrayBuffer = await blobToArrayBuffer(data);
    const zip = new AdmZip(Buffer.from(buffer));
    const zipEntries = zip.getEntries();
    const assetsDir = {};
    
    zipEntries.forEach((entry) => {
        const entryName = entry.entryName;
        if (!entry.isDirectory) {
            assetsDir[entryName] = entry.getData();
        }
    });

    return assetsDir;
}

async function getAssetsInLocalMemory(fileName) {
    try {
        const zipBuffer = fs.readFileSync(fileName);
        const zip = new AdmZip(zipBuffer);
        const zipEntries = zip.getEntries();
        const assetsDir = {};
        zipEntries.forEach((entry) => {
            const entryName = entry.entryName;
            if (!entry.isDirectory) {
                assetsDir[entryName] = entry.getData();
            }
        });

        return assetsDir;
    } catch (error) {
        throw new Error(`Error loading '${fileName}': ${error.message}`);
    }
}

module.exports = {
    getAssetsInMemory,
    getAssetsInLocalMemory,
};