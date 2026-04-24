import { forwardRef } from 'react';
import { MaterialRequest, MaterialRequestLine } from '@/hooks/useMaterialRequests';
import { format } from 'date-fns';

interface MaterialRequestPrintViewProps {
  materialRequest: MaterialRequest;
  lines: MaterialRequestLine[];
}

export const MaterialRequestPrintView = forwardRef<HTMLDivElement, MaterialRequestPrintViewProps>(
  ({ materialRequest, lines }, ref) => {
    // Ensure we have at least 20 rows for the table
    const displayLines = [...lines];
    while (displayLines.length < 20) {
      displayLines.push({
        line_num: displayLines.length + 1,
        part_no: '',
        description: '',
        unit_of_measurement: '',
        quantity: 0,
        remark: '',
      });
    }

    return (
      <div ref={ref} className="print-container bg-white p-8 text-black" style={{ fontFamily: 'Arial, sans-serif' }}>
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-1">Material Request - طلب مواد</h1>
          <div className="w-full border-b-2 border-black mb-4"></div>
        </div>

        {/* Company Name */}
        <div className="text-center mb-6">
          <h2 className="text-xl font-bold">ALSULTAN CONTRACTING</h2>
        </div>

        {/* Form Header Fields */}
        <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-6 text-sm">
          <div className="flex">
            <span className="font-semibold w-40">Material Request MR#:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.mr_number}</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-32">Attachment:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.attachment_url ? 'Yes' : ''}</span>
          </div>

          <div className="flex">
            <span className="font-semibold w-40">Date:</span>
            <span className="border-b border-black flex-1 px-2">
              {materialRequest.request_date ? format(new Date(materialRequest.request_date), 'yyyy-MM-dd') : ''}
            </span>
          </div>
          <div className="flex">
            <span className="font-semibold w-32">Sole Source Adjustment:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.sole_source_adjustment || ''}</span>
          </div>

          <div className="flex">
            <span className="font-semibold w-40">Project Name:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.project_name || ''}</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-32">Ref:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.reference || ''}</span>
          </div>

          <div className="flex">
            <span className="font-semibold w-40">Sector:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.sector || ''}</span>
          </div>
          <div className="flex">
            <span className="font-semibold w-32">Category:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.category || ''}</span>
          </div>

          <div className="flex col-span-2">
            <span className="font-semibold w-40">Department:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.department || ''}</span>
          </div>

          <div className="flex col-span-2">
            <span className="font-semibold w-40">Delivery Location:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.delivery_location || ''}</span>
          </div>

          <div className="flex col-span-2">
            <span className="font-semibold w-40">Store availability:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.store_availability || ''}</span>
          </div>

          <div className="flex col-span-2">
            <span className="font-semibold w-40">SPEC:</span>
            <span className="border-b border-black flex-1 px-2">{materialRequest.spec || ''}</span>
          </div>

          <div className="flex col-span-2">
            <span className="font-semibold w-40">Due out (delivery before):</span>
            <span className="border-b border-black flex-1 px-2">
              {materialRequest.due_out_date ? format(new Date(materialRequest.due_out_date), 'yyyy-MM-dd') : ''}
            </span>
          </div>
        </div>

        {/* Lines Table */}
        <table className="w-full border-collapse border border-black text-sm mb-6">
          <thead>
            <tr className="bg-gray-200">
              <th className="border border-black p-2 w-10">S.N</th>
              <th className="border border-black p-2 w-24">Part No.</th>
              <th className="border border-black p-2">Description</th>
              <th className="border border-black p-2 w-20">Unit of Measurement</th>
              <th className="border border-black p-2 w-16">Quantity</th>
              <th className="border border-black p-2">Remark/Purpose of Use</th>
            </tr>
          </thead>
          <tbody>
            {displayLines.map((line, index) => (
              <tr key={index}>
                <td className="border border-black p-1 text-center">{index + 1}</td>
                <td className="border border-black p-1">{line.part_no || ''}</td>
                <td className="border border-black p-1">{line.description || ''}</td>
                <td className="border border-black p-1 text-center">{line.unit_of_measurement || ''}</td>
                <td className="border border-black p-1 text-center">{line.quantity || ''}</td>
                <td className="border border-black p-1">{line.remark || ''}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Signature Section */}
        <div className="grid grid-cols-2 gap-4 text-sm mt-8">
          {/* Requested By */}
          <div className="border border-black p-3">
            <div className="font-bold mb-2">Requested By:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Name:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.requested_by_name || ''}</div>
              </div>
              <div>
                <span className="font-semibold">Date:</span>
                <div className="border-b border-black h-6 mt-1">
                  {materialRequest.requested_at ? format(new Date(materialRequest.requested_at), 'yyyy-MM-dd') : ''}
                </div>
              </div>
              <div>
                <span className="font-semibold">Signature:</span>
                <div className="border-b border-black h-8 mt-1"></div>
              </div>
              <div>
                <span className="font-semibold">Depart./Position:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.requested_by_position || ''}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">E-mail:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.requested_by_email || ''}</div>
              </div>
            </div>
          </div>

          {/* Reviewed By */}
          <div className="border border-black p-3">
            <div className="font-bold mb-2">Reviewed By:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Name:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.reviewed_by_name || ''}</div>
              </div>
              <div>
                <span className="font-semibold">Date:</span>
                <div className="border-b border-black h-6 mt-1">
                  {materialRequest.reviewed_at ? format(new Date(materialRequest.reviewed_at), 'yyyy-MM-dd') : ''}
                </div>
              </div>
              <div>
                <span className="font-semibold">Signature:</span>
                <div className="border-b border-black h-8 mt-1"></div>
              </div>
              <div>
                <span className="font-semibold">Depart./Position:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.reviewed_by_position || ''}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">E-mail:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.reviewed_by_email || ''}</div>
              </div>
            </div>
          </div>

          {/* Approved By 1 */}
          <div className="border border-black p-3">
            <div className="font-bold mb-2">Approved By:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Name:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_1_name || ''}</div>
              </div>
              <div>
                <span className="font-semibold">Date:</span>
                <div className="border-b border-black h-6 mt-1">
                  {materialRequest.approved_at_1 ? format(new Date(materialRequest.approved_at_1), 'yyyy-MM-dd') : ''}
                </div>
              </div>
              <div>
                <span className="font-semibold">Signature:</span>
                <div className="border-b border-black h-8 mt-1"></div>
              </div>
              <div>
                <span className="font-semibold">Depart./Position:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_1_position || ''}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">E-mail:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_1_email || ''}</div>
              </div>
            </div>
          </div>

          {/* Approved By 2 */}
          <div className="border border-black p-3">
            <div className="font-bold mb-2">Approved By:</div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="font-semibold">Name:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_2_name || ''}</div>
              </div>
              <div>
                <span className="font-semibold">Date:</span>
                <div className="border-b border-black h-6 mt-1">
                  {materialRequest.approved_at_2 ? format(new Date(materialRequest.approved_at_2), 'yyyy-MM-dd') : ''}
                </div>
              </div>
              <div>
                <span className="font-semibold">Signature:</span>
                <div className="border-b border-black h-8 mt-1"></div>
              </div>
              <div>
                <span className="font-semibold">Depart./Position:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_2_position || ''}</div>
              </div>
              <div className="col-span-2">
                <span className="font-semibold">E-mail:</span>
                <div className="border-b border-black h-6 mt-1">{materialRequest.approved_by_2_email || ''}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }
);

MaterialRequestPrintView.displayName = 'MaterialRequestPrintView';
