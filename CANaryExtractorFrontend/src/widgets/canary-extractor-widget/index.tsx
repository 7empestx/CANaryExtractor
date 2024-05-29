import React, { useState, useEffect } from "react";
import Header from "@cloudscape-design/components/header";
import Box from "@cloudscape-design/components/box";
import { isVisualRefresh } from "./../../common/apply-mode";
import { WidgetConfig } from "../interfaces";
import axios from "axios";

export const canarayExtractor: WidgetConfig = {
  definition: { defaultRowSpan: 3, defaultColumnSpan: 2 },
  data: {
    icon: "table",
    title: "CANarayExtractor",
    description: "Canary Extractor",
    disableContentPaddings: !isVisualRefresh,
    header: CANarayExtractorHeader,
    content: CANarayExtractor,
    footer: CANarayExtractorFooter,
  },
};

function CANarayExtractorHeader() {
  return <Header>CANaray Extractor</Header>;
}

function CANarayExtractorFooter() {
  return <></>;
}

interface RowData {
  timestamp: string;
  canId: string;
  canData: string;
}

export default function CANarayExtractor() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [rows, setRows] = useState<RowData[] | null>(null);
  const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const rowsPerPage = 100; // Adjust this value as needed

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const response = await axios.post("http://localhost:3000/upload", formData);
      setRows(response.data.rows);

      // Handle the transfer data to create a download link
      const transferDataBuffer = response.data.transferData.data;
      const transferData = new Uint8Array(transferDataBuffer);
      console.log("Transfer Data Uint8Array:", transferData); // Debugging log
      const blob = new Blob([transferData], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      console.log("Generated Blob URL:", url); // Debugging log
      setDownloadUrl(url);

    } catch (error) {
      console.error("Error uploading file:", error);
    } finally {
      setUploading(false);
    }
  };

  const hexStringToUint8Array = (hexString: string): Uint8Array => {
    const match = hexString.match(/.{1,2}/g);
    if (match) {
      return new Uint8Array(match.map(byte => parseInt(byte, 16)));
    }
    return new Uint8Array();
  };

  const formatHexWithSpaces = (hexString: string) => {
    return hexString.match(/.{1,2}/g)?.join(' ') || hexString;
  };

  const displayRows = rows ? rows.slice(page * rowsPerPage, (page + 1) * rowsPerPage) : [];

  useEffect(() => {
    console.log("Download URL in useEffect:", downloadUrl);
  }, [downloadUrl]);

  return (
    <>
      <Box textAlign="center" padding="s">
        <input type="file" onChange={handleFileChange} />
        <button onClick={handleUpload} disabled={uploading}>
          {uploading ? "Uploading..." : "Upload and Extract"}
        </button>
        {downloadUrl && (
          <div>
            <a href={downloadUrl} download="output.transferdata.bin">
              Download Transfer Data
            </a>
          </div>
        )}
      </Box>
    </>
  );
}
