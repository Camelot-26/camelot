"use client";

import Link from "next/link";
import {
  customerEnquiryTypes,
  enquiryStatuses,
  type EnquiryStatusValue,
} from "@/lib/enquiry-constants";

type CustomerEnquiryRow = {
  id: string;
  enquiryNumber: string;
  subject: string;
  enquiryType: string;
  createdAt: string;
  updatedAt: string;
  status: EnquiryStatusValue;
};

type CustomerEnquiryFilters = {
  q: string;
  type: string;
  status: string;
  page: number;
  pageSize: number;
};

function statusLabel(status: EnquiryStatusValue) {
  return status
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function pageHref(filters: CustomerEnquiryFilters, page: number) {
  const params = new URLSearchParams();
  if (filters.q) params.set("q", filters.q);
  if (filters.type) params.set("type", filters.type);
  if (filters.status) params.set("status", filters.status);
  if (filters.pageSize !== 10) params.set("pageSize", String(filters.pageSize));
  params.set("page", String(page));
  return `/customer/enquiries?${params.toString()}`;
}

export function CustomerEnquiries({
  enquiries,
  filters,
  pageCount,
  total,
}: {
  enquiries: CustomerEnquiryRow[];
  filters: CustomerEnquiryFilters;
  pageCount: number;
  total: number;
}) {
  return (
    <section className="admin-enquiries-page customer-enquiries-page">
      <header className="admin-enquiries-header">
        <div>
          <p className="eyebrow">Your questions</p>
          <h1>My enquiries</h1>
          <p>Follow your enquiries and continue conversations with our team.</p>
        </div>
        <Link
          className="button button-dark admin-booking-create"
          href="/customer/enquiries/new"
        >
          Create enquiry
        </Link>
      </header>

      <section aria-label="My enquiries" className="admin-enquiries-panel">
        <form className="admin-enquiry-filters" method="get">
          <label className="admin-directory-search">
            <span className="sr-only">Search by enquiry ID or subject</span>
            <span aria-hidden="true">⌕</span>
            <input
              defaultValue={filters.q}
              name="q"
              placeholder="Enquiry ID or subject"
              type="search"
            />
          </label>
          <label>
            <span className="sr-only">Filter by enquiry type</span>
            <select defaultValue={filters.type} name="type">
              <option value="">All enquiry types</option>
              {customerEnquiryTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter by enquiry status</span>
            <select defaultValue={filters.status} name="status">
              <option value="">All statuses</option>
              {enquiryStatuses.map((status) => (
                <option key={status} value={status}>
                  {statusLabel(status)}
                </option>
              ))}
            </select>
          </label>
          <button className="admin-booking-filter-submit" type="submit">
            Apply filters
          </button>
          <span className="admin-directory-count">
            {total} {total === 1 ? "enquiry" : "enquiries"}
          </span>
        </form>

        {enquiries.length ? (
          <div className="admin-enquiry-table-wrap">
            <table className="admin-directory-table customer-enquiries-table">
              <thead>
                <tr>
                  <th scope="col">Enquiry ID</th>
                  <th scope="col">Subject</th>
                  <th scope="col">Enquiry type</th>
                  <th scope="col">Created date</th>
                  <th scope="col">Last updated</th>
                  <th scope="col">Status</th>
                  <th scope="col">Actions</th>
                </tr>
              </thead>
              <tbody>
                {enquiries.map((enquiry) => (
                  <tr key={enquiry.id}>
                    <td data-label="Enquiry ID">
                      <strong>{enquiry.enquiryNumber}</strong>
                    </td>
                    <td data-label="Subject">{enquiry.subject}</td>
                    <td data-label="Enquiry type">{enquiry.enquiryType}</td>
                    <td data-label="Created date">
                      {formatDate(enquiry.createdAt)}
                    </td>
                    <td data-label="Last updated">
                      {formatDate(enquiry.updatedAt)}
                    </td>
                    <td data-label="Status">
                      <span
                        className={`enquiry-status enquiry-status-${enquiry.status.toLowerCase().replaceAll("_", "-")}`}
                      >
                        {statusLabel(enquiry.status)}
                      </span>
                    </td>
                    <td data-label="Actions">
                      <Link
                        className="admin-directory-action"
                        href={`/customer/enquiries/${enquiry.id}`}
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-directory-empty">
            <h2>{total ? "No enquiries on this page" : "No enquiries found"}</h2>
            <p>
              {total
                ? "Choose another page or adjust your filters."
                : filters.q || filters.type || filters.status
                  ? "Try changing the filters to find your enquiry."
                  : "Your enquiries and replies will appear here."}
            </p>
            {!total && (
              <Link className="button button-dark" href="/customer/enquiries/new">
                Create an enquiry
              </Link>
            )}
          </div>
        )}

        <footer className="admin-directory-pagination">
          <span aria-live="polite" className="admin-directory-page-range">
            Showing {total ? (filters.page - 1) * filters.pageSize + 1 : 0}–
            {Math.min(filters.page * filters.pageSize, total)} of {total}
          </span>
          <div className="admin-directory-page-navigation">
            <span>
              Page {filters.page} of {pageCount}
            </span>
            <Link
              aria-disabled={filters.page <= 1}
              className={filters.page <= 1 ? "is-disabled" : ""}
              href={pageHref(filters, Math.max(1, filters.page - 1))}
              tabIndex={filters.page <= 1 ? -1 : undefined}
            >
              Previous
            </Link>
            <Link
              aria-disabled={filters.page >= pageCount}
              className={filters.page >= pageCount ? "is-disabled" : ""}
              href={pageHref(filters, Math.min(pageCount, filters.page + 1))}
              tabIndex={filters.page >= pageCount ? -1 : undefined}
            >
              Next
            </Link>
          </div>
        </footer>
      </section>
    </section>
  );
}
