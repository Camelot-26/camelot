import { enquiryTypes, type EnquiryTypeValue } from "@/lib/enquiry-constants";

export type EnquiryDetailsInput = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  subject: string;
  enquiryType: string;
  description: string;
};

export function validateEnquiryDetails(input: EnquiryDetailsInput) {
  if (!input.customerName || input.customerName.length > 120) {
    return "Enter a customer name (maximum 120 characters).";
  }
  if (!input.customerEmail && !input.customerPhone) {
    return "Enter an email address or contact number.";
  }
  if (
    input.customerEmail &&
    (input.customerEmail.length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.customerEmail))
  ) {
    return "Enter a valid email address.";
  }
  if (input.customerPhone.length > 40) {
    return "Contact number must be 40 characters or less.";
  }
  if (!input.subject || input.subject.length > 180) {
    return "Enter an enquiry subject (maximum 180 characters).";
  }
  if (!enquiryTypes.includes(input.enquiryType as EnquiryTypeValue)) {
    return "Select a valid enquiry type.";
  }
  if (!input.description || input.description.length > 10000) {
    return "Enter an enquiry description (maximum 10,000 characters).";
  }
  return null;
}
