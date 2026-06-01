"use client";

export function PDFExport() {
  const handleExportPDF = () => {
    window.print();
  };

  return null; // This component is used via the Print button in TimetableView
}

// Utility function to trigger PDF export
export function triggerPDFExport() {
  window.print();
}
