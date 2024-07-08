const multer = require('multer');
const { GridFsStorage } = require('multer-gridfs-storage');
const mongoose = require('mongoose');
const Grid = require('gridfs-stream');

// whole Upload.js only deal with audio file
//multer take data (audio video any ) from Form data (come from front end )
// GridFsStorage in act as bridge. The GridFsStorage configuratio the structure of the metadata or object  that will be stored in the uploads.files collection within MongoDB.
// gridFs break data and store in chunks(upload.chunks) and files ( upload.files for meta data), files object  map it chunk used  for reterival of data 
let gfs;
const conn = mongoose.connection;
conn.once('open', () => {
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('uploads'); // Set the collection name (optional)
});

const storage = new GridFsStorage({
  url: process.env.DATABASE_URL,
  options: {},
  file: (req, file) => {   // here define structure for meta data / upload files 
    const unique_id = new mongoose.Types.ObjectId();
    req.tweetId = unique_id;
    return {
      _id :unique_id,
      filename: req.tweetId.toString(),
      bucketName: 'uploads' // Should match the collection name used by GridFS
    };
  }
});

const uploader = multer({ storage });

module.exports = uploader;
