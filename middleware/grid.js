const mongoose = require('mongoose');
const { GridFSBucket } = require('mongoose').mongo; // Import GridFSBucket from mongoose.mongo
const express = require('express');
const app = express();
const port = 3000;

let gfsBucket;

const conn = mongoose.connection;
conn.once('open', () => {
  gfsBucket = new GridFSBucket(conn.db, { bucketName: 'uploads' }); // Specify bucket name
});

const getFileStreamByFilename = async (filename) => {

  try {
    const files = await gfsBucket.find({ filename: filename }).toArray();

    if (!files || files.length === 0) {
      throw new Error('File not found');
    }

    const file = files[0];
    const readStream = gfsBucket.openDownloadStream(file._id);
    const buffer = [];

    return new Promise((resolve, reject) => {
      readStream.on('data', (chunk) => {
        buffer.push(chunk);
      });

      readStream.on('end', () => {
        const finalBuffer = Buffer.concat(buffer);
        resolve({ buffer: finalBuffer, contentType: file.contentType });
      });

      readStream.on('error', (err) => {
        reject(err);
      });
    });
  } catch (err) {
    throw err;
  }
};

const deleteVoiceNode = async(filename) =>{
  console.log("hello", filename);
  try{
    const files = await gfsBucket.find({ filename: filename }).toArray();
    if (!files || files.length === 0) {
      throw new Error('File not found');
    }
    await gfsBucket.delete(files[0]._id);
    return {message:"delete sucessfully"};
  }
  catch(err){
    throw err;
  }
}

module.exports = {
  getFileStreamByFilename,
  deleteVoiceNode
};
