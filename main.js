const exiftool = require('node-exiftool');
const exiftoolBin = require('dist-exiftool');
const co = require('co');
const sharp = require('sharp');
const fs = require('mz/fs');
const path = require('path');
const del = require('del');

co(main);

function* main() {

    let dir = 'C:\\Nextcloud\\@Family project\\@Main grandma albumn\\new scans';
    let outdir = path.join(dir, 'faces');

    let files = yield getFiles(dir);

    yield del(outdir, { force: true });
    yield fs.mkdir(outdir);

    for (let file of files) {

        let meta = yield readMeta(file);
        let faces = getRegions(meta).filter(i => i.type == 'Face');

        for (let face of faces) {
            yield extractRegions(file, face, outdir);
        }

        console.log(file);
    }
}

function* getFiles(dir) {

    let files = yield fs.readdir(dir);
    let res = [];

    for (let f of files) {
        let file = path.join(dir, f);

        let stat = yield fs.stat(file);

        if (!stat.isDirectory()) {
            res.push(file);
        }
    }

    return res;
}

function* extractRegions(file, region, outDir) {

    let img = sharp(file);

    let meta = yield img.metadata();

    let res = img.extract({
        left: Math.floor(meta.width * (region.x - region.w / 2)),
        top: Math.floor(meta.height * (region.y - region.h / 2)),
        width: Math.floor(meta.width * region.w),
        height: Math.floor(meta.height * region.h)
    });

    outDir = path.join(outDir, region.name);

    if (!(yield fs.exists(outDir))) {
        yield fs.mkdir(outDir);
    }

    yield res.toFile(path.join(outDir, path.basename(file)));
}

function getRegions(meta) {
    let res = [];

    if (typeof meta.RegionName == 'string') {
        res.push({
            name: meta.RegionName,
            type: meta.RegionType,
            x: meta.RegionAreaX,
            y: meta.RegionAreaY,
            w: meta.RegionAreaW,
            h: meta.RegionAreaH
        });
    } else if (typeof meta.RegionName == 'array') {
        for (let i = 0; i < meta.RegionName.length; i++) {
            res.push({
                name: meta.RegionName[i],
                type: meta.RegionType[i],
                x: meta.RegionAreaX[i],
                y: meta.RegionAreaY[i],
                w: meta.RegionAreaW[i],
                h: meta.RegionAreaH[i]
            });
        }
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