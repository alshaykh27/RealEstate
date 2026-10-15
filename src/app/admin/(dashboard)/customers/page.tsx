import { CustomerForm } from "@/components/admin/customer-form";
import { DeleteCustomerButton } from "@/components/admin/delete-customer-button";
import { PageHeader } from "@/components/admin/ui";
import { admin } from "@/i18n/admin";
import { formatDate } from "@/lib/content";
import { getAdminCustomers } from "@/lib/data/admin";

export const metadata = { title: admin.customers.title };

export default async function AdminCustomersPage() {
  const customers = await getAdminCustomers();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={admin.customers.title} description={admin.customers.hint} />

      <CustomerForm />

      {customers.length === 0 ? (
        <p className="border-line bg-surface text-ink-secondary rounded-xl border px-5 py-10 text-center text-sm">
          {admin.customers.empty}
        </p>
      ) : (
        <div className="border-line bg-surface overflow-x-auto rounded-xl border shadow-[var(--shadow-card)]">
          <table className="w-full min-w-[40rem] border-collapse text-start text-sm">
            <thead>
              <tr className="border-line text-ink-secondary border-b text-start text-xs">
                <th className="px-4 py-3 text-start font-medium">{admin.customers.colName}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.customers.colPhone}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.customers.colNotes}</th>
                <th className="px-4 py-3 text-start font-medium">{admin.customers.colDate}</th>
                <th className="px-4 py-2 text-end font-medium">{admin.common.delete}</th>
              </tr>
            </thead>
            <tbody className="divide-line divide-y">
              {customers.map((customer) => (
                <tr key={customer.id} className="hover:bg-surface-cream/50 align-middle">
                  <td className="text-ink px-5 py-3 font-medium">{customer.name}</td>
                  <td className="text-ink-secondary px-5 py-3 whitespace-nowrap" dir="ltr">
                    {customer.phone}
                  </td>
                  <td className="text-ink-secondary max-w-xs px-5 py-3 whitespace-pre-wrap">
                    {customer.notes || admin.customers.noNotes}
                  </td>
                  <td className="text-ink-muted px-5 py-3 text-xs whitespace-nowrap">
                    {formatDate("ar", customer.created_at)}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center justify-end">
                      <DeleteCustomerButton id={customer.id} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
