import { Download, Printer } from "lucide-react";
import type { Order, Member } from "../../types";
import { getOrderCode } from "../../services/orderCode";
import { formatRupiah } from "../../utils";

interface ReceiptProps {
  order: Order;
  member: Member;
  onClose: () => void;
}

export default function Receipt({ order, member, onClose }: ReceiptProps) {
  const generatePDF = async () => {
    try {
      const content = generateReceiptHTML();
      const blob = new Blob([content], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `receipt-${getOrderCode(order)}.html`;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Error downloading receipt:", error);
    }
  };

  const printReceipt = () => {
    const printWindow = window.open("", "", "height=600,width=800");
    if (printWindow) {
      printWindow.document.write(generateReceiptHTML());
      printWindow.document.close();
      printWindow.print();
    }
  };

  const generateReceiptHTML = () => {
    const date = new Date();
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Receipt ${getOrderCode(order)}</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { text-align: center; border-bottom: 2px solid #000; padding-bottom: 20px; margin-bottom: 20px; }
          .header h1 { margin: 0; font-size: 28px; }
          .header p { margin: 5px 0; color: #666; }
          .section { margin-bottom: 20px; }
          .section h3 { border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 10px; }
          .row { display: flex; justify-content: space-between; padding: 8px 0; }
          .label { font-weight: bold; color: #333; }
          .value { text-align: right; }
          .total { background: #f0f0f0; padding: 10px; border-radius: 4px; font-size: 18px; font-weight: bold; }
          .total .row { font-size: 18px; }
          .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px; }
          table { width: 100%; border-collapse: collapse; margin: 10px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #eee; }
          th { background: #f5f5f5; font-weight: bold; }
          @media print { body { margin: 0; padding: 0; } }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>RECEIPT</h1>
          <p>Tokopedia Kari Indonesia</p>
          <p>Order Confirmation & Transaction Proof</p>
        </div>

        <div class="section">
          <h3>Order Information</h3>
          <div class="row">
            <span class="label">Order Number:</span>
            <span class="value">${getOrderCode(order)}</span>
          </div>
          <div class="row">
            <span class="label">Order Date:</span>
            <span class="value">${order.createdAt}</span>
          </div>
          <div class="row">
            <span class="label">Submitted Date:</span>
            <span class="value">${order.submittedAt || "Pending"}</span>
          </div>
          <div class="row">
            <span class="label">Current Status:</span>
            <span class="value"><strong>${order.status}</strong></span>
          </div>
        </div>

        <div class="section">
          <h3>Member Information</h3>
          <div class="row">
            <span class="label">Name:</span>
            <span class="value">${member.username}</span>
          </div>
          <div class="row">
            <span class="label">Phone:</span>
            <span class="value">${member.phone}</span>
          </div>
          <div class="row">
            <span class="label">Level:</span>
            <span class="value">${member.level}</span>
          </div>
          <div class="row">
            <span class="label">Referred By:</span>
            <span class="value">${member.referredBy}</span>
          </div>
        </div>

        <div class="section">
          <h3>Product Details</h3>
          <table>
            <thead>
              <tr>
                <th>Product Code</th>
                <th>Product Name</th>
                <th>Price</th>
                <th>Commission</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${order.productCode || "-"}</td>
                <td>${order.productName || "Pending Assignment"}</td>
                <td>${formatRupiah(order.value || 0)}</td>
                <td>${formatRupiah(order.commission || 0)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="section">
          <div class="total">
            <div class="row">
              <span>Total Amount Required:</span>
              <span>${formatRupiah(order.requiredBalance || order.value || 0)}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h3>Transaction ID</h3>
          <div class="row">
            <span class="label">ID:</span>
            <span class="value" style="font-family: monospace; font-size: 12px;">${order.id}</span>
          </div>
        </div>

        <div class="footer">
          <p>This is a computer-generated receipt. No signature required.</p>
          <p>Generated on ${date.toLocaleString()}</p>
          <p>Keep this receipt for your records.</p>
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 px-4">
      <div className="w-full max-w-2xl rounded bg-white shadow-panel max-h-96 overflow-y-auto">
        {/* Receipt Display */}
        <div className="p-8 bg-white">
          <div className="text-center border-b-2 border-slate-300 pb-6 mb-6">
            <h1 className="text-4xl font-bold">RECEIPT</h1>
            <p className="text-slate-600">Tokopedia Kari Indonesia</p>
            <p className="text-sm text-slate-500">Order Confirmation & Transaction Proof</p>
          </div>

          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <h3 className="font-bold mb-3 pb-2 border-b">Order Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Order Number:</span>
                  <span className="font-bold">{getOrderCode(order)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Order Date:</span>
                  <span>{order.createdAt}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <span className="font-bold text-emerald-700">{order.status}</span>
                </div>
              </div>
            </div>

            <div>
              <h3 className="font-bold mb-3 pb-2 border-b">Member Information</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Name:</span>
                  <span className="font-bold">{member.username}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Phone:</span>
                  <span>{member.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Level:</span>
                  <span>{member.level}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-6">
            <h3 className="font-bold mb-3 pb-2 border-b">Product Details</h3>
            <div className="bg-slate-50 p-4 rounded text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-600">Product Code:</span>
                <span className="font-mono">{order.productCode || "-"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Product Name:</span>
                <span>{order.productName || "Pending Assignment"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Price:</span>
                <span>{formatRupiah(order.value || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Commission:</span>
                <span className="text-emerald-700 font-bold">{formatRupiah(order.commission || 0)}</span>
              </div>
            </div>
          </div>

          <div className="bg-forest/10 p-4 rounded mb-6">
            <div className="flex justify-between">
              <span className="font-bold">Total Required:</span>
              <span className="text-2xl font-bold text-forest">{formatRupiah(order.requiredBalance || order.value || 0)}</span>
            </div>
          </div>

          <div className="text-xs text-slate-500 text-center pb-4 border-b">
            <p>Transaction ID: <span className="font-mono text-slate-700">{order.id}</span></p>
            <p className="mt-2">Generated on {new Date().toLocaleString()}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3 p-4 bg-slate-50 border-t">
          <button
            onClick={printReceipt}
            className="flex-1 flex items-center justify-center gap-2 rounded bg-sky-600 px-4 py-2 font-bold text-white hover:bg-sky-700"
          >
            <Printer size={18} />
            Print
          </button>
          <button
            onClick={generatePDF}
            className="flex-1 flex items-center justify-center gap-2 rounded bg-emerald-600 px-4 py-2 font-bold text-white hover:bg-emerald-700"
          >
            <Download size={18} />
            Download
          </button>
          <button
            onClick={onClose}
            className="flex-1 rounded border border-slate-200 px-4 py-2 font-bold hover:bg-slate-100"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
