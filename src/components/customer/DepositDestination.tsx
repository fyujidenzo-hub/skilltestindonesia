// import type { BankPlacement } from "../../types";

// export default function DepositDestination({ banks }: { banks: BankPlacement[] }) {
//   const activeBanks = banks.filter((bank) => bank.active);

//   return (
//     <section className="rounded bg-white p-5 shadow-panel">
//       <h2 className="text-lg font-black">Deposit destination</h2>
//       <div className="mt-4 space-y-3">
//         {activeBanks.length ? (
//           activeBanks.map((bank) => (
//             <div key={bank.id} className="rounded border border-slate-200 p-4">
//               <p className="text-xs font-bold uppercase text-slate-500">Bank name</p>
//               <p className="font-bold">{bank.bank}</p>
//               <p className="mt-3 text-xs font-bold uppercase text-slate-500">Account number</p>
//               <p className="rounded bg-slate-50 px-3 py-2 text-sm font-bold text-slate-500">
//                 Available after opening a Top Up request
//               </p>
//               <p className="mt-3 text-xs font-bold uppercase text-slate-500">Account owner name</p>
//               <p className="text-sm font-semibold text-slate-700">{bank.accountName}</p>
//             </div>
//           ))
//         ) : (
//           <p className="rounded bg-amber-50 p-4 text-sm font-bold text-amber-700">
//             Bank details are not available yet. Please contact customer service.
//           </p>
//         )}
//       </div>
//     </section>
//   );
// }


import type { BankPlacement } from "../../types";

export default function DepositDestination({ banks }: { banks: BankPlacement[] }) {
  return null;
}