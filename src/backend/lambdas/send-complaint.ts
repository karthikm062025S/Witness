// Send Complaint Lambda - Filing Assistance Endpoint
// API Gateway Lambda that returns filing options (mailto link, phone numbers, addresses)

import { corsHeaders } from "../utils/cors";

/**
 * Lambda handler for POST /send-complaint
 * Returns filing options based on jurisdiction
 * 
 * @param event - API Gateway HTTP API event
 * @returns Filing options including mailto link, phone numbers, online form, and contacts
 */
export const handler = async (event: any) => {
  // Handle OPTIONS preflight
  if (event.requestContext?.http?.method === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ""
    };
  }

  try {
    // Parse request body
    const body = JSON.parse(event.body || "{}");
    const { letter, jurisdiction } = body;

    // Validate required fields
    if (!letter || typeof letter !== "string") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing or invalid 'letter' field"
        })
      };
    }

    if (!jurisdiction || typeof jurisdiction !== "string") {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Missing or invalid 'jurisdiction' field"
        })
      };
    }

    // Build mailto link
    const subject = "Housing Code Violation Complaint";
    const mailtoLink = `mailto:codeenforcement@blacksburg.gov?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(letter)}`;

    // Base response with Blacksburg contacts
    const response = {
      mailto_link: mailtoLink,
      phone_numbers: [
        "(540) 443-1612",  // Code Inspector
        "(540) 443-1300"   // Planning & Building
      ],
      online_form: "https://www.tobweb.org/ayr/",
      address: "300 South Main Street, Blacksburg, VA 24060",
      contacts: [] as Array<{ name: string; phone: string; type: string }>
    };

    // Add jurisdiction-specific contacts
    if (jurisdiction === "blacksburg" || jurisdiction === "montgomery_county") {
      response.contacts.push({
        name: "Montgomery County Building and Inspection",
        phone: "(540) 382-6120 ext. 160",
        type: "county_fallback"
      });
    }

    // Always include Virginia state escalation contact
    response.contacts.push({
      name: "Virginia Department of Housing and Community Development",
      phone: "(804) 371-7150",
      type: "state_escalation"
    });

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(response)
    };

  } catch (error) {
    console.error("Send complaint failed:", error);
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        error: "Internal server error"
      })
    };
  }
};
