require("dotenv").config();

module.exports = {
  PORT: process.env.APP_PORT,
  DB: process.env.APP_DB,
  SECRET: process.env.APP_SECRET,
  accessKeyId: process.env.S3_ACCESS_KEY,
  secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
  region: process.env.S3_BUCKET_REGION,
  emailAddress: process.env.EMAIL_ADDRESS,
  emailPassword: process.env.EMAIL_PASSWORD,
};
