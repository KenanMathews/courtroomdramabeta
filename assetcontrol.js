const AdmZip = require('adm-zip');
const { downloadFromSupabase } = require('./supabase')


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
async function blobToArrayBuffer(blob) {
    if (blob.arrayBuffer) {
        return await blob.arrayBuffer();
    } else {
        throw new Error('arrayBuffer method is not available in this environment.');
    }
}

module.exports = {
    getAssetsInMemory,
};