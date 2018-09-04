const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const co = require('co');
const sharp = require('sharp');

co(main);

function* main() {
    let file = 'C:\\Users\\Alexander\\Desktop\\81.jpg';

    let meta = yield readMeta(file);
    let faces = getRegions(meta);

    yield extractRegions(file, faces);

    console.log(faces);
}

function* extractRegions(file, regions) {
    let r = regions[0];

    let img = sharp(file);

    let meta = yield img.metadata();

    let region = img.extract({
        left: Math.floor(meta.width * (r.x - r.w / 2)),
        top: Math.floor(meta.height * (r.y - r.h / 2)),
        width: Math.floor(meta.width * r.w),
        height: Math.floor(meta.height * r.h)
    });

    yield region.toFile('C:\\Users\\Alexander\\Desktop\\out.jpg');
}

function getRegions(meta) {
    let res = [];

    for (let i = 0; i < meta.RegionName.length; i++) {
        res.push({
            name: meta.RegionName[i],
            type: meta.RegionType[i],
            x: meta.RegionAreaX[i],
            y: meta.RegionAreaY[i],
            w: meta.RegionAreaW[i],
            h: meta.RegionAreaH[i],
            rotation: meta.RegionRotation[i]
        });
    }

    return res;
}

function* readMeta(file) {
    let ep = new exiftool.ExiftoolProcess(exiftoolBin);
    yield ep.open();
    let meta = yield ep.readMetadata(file, ['-File:all']);
    yield ep.close();

    if (meta.error) {
        throw new Error(meta.error);
    }

    return meta.data[0];
}