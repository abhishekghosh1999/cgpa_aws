import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

const awsRegion = process.env.AWS_REGION;
const s3BucketName = process.env.S3_BUCKET_NAME;
const s3ReportsPrefix = (process.env.S3_REPORTS_PREFIX || "cgpa-reports").replace(/^\/+|\/+$/g, "");

const canUseS3Reports = Boolean(
  awsRegion &&
    s3BucketName &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY
);

const s3Client = canUseS3Reports
  ? new S3Client({
      region: awsRegion
    })
  : null;

const safeSegment = (value) =>
  String(value || "")
    .trim()
    .replace(/[^a-zA-Z0-9-_]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();

export const uploadStudentReportToS3 = async (studentDoc) => {
  if (!s3Client) {
    return null;
  }

  const enrollmentNo = safeSegment(studentDoc.enrollmentNo) || "unknown";
  const now = new Date();
  const datePath = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(
    now.getUTCDate()
  ).padStart(2, "0")}`;
  const fileName = `${Date.now()}-${enrollmentNo}.json`;
  const key = `${s3ReportsPrefix}/${datePath}/${fileName}`;

  const command = new PutObjectCommand({
    Bucket: s3BucketName,
    Key: key,
    Body: JSON.stringify(studentDoc, null, 2),
    ContentType: "application/json"
  });

  await s3Client.send(command);

  return `https://${s3BucketName}.s3.${awsRegion}.amazonaws.com/${key}`;
};

export const isS3ReportingEnabled = canUseS3Reports;
