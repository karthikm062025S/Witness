// TypeScript Type Definitions for WITNESS Backend API

// Category types for housing code violations
export type Category = 
  | "structural" 
  | "electrical" 
  | "plumbing" 
  | "environmental" 
  | "fire_safety" 
  | "pest" 
  | "heating";

// Confidence levels for observations and violations
export type Confidence = "high" | "medium" | "low";

// Severity levels for violations
export type Severity = "high" | "moderate" | "low";

// Observation from Stage 1 (Vision Analysis)
export interface Observation {
  description: string;
  category: Category;
  confidence: Confidence;
}

// Violation from Stage 2 (Code Matching)
export interface Violation {
  code_section: string;  // e.g., "VMC_305_1" — matches DynamoDB sort key
  code_display: string;  // e.g., "VMC § 305.1"
  title: string;
  match_reasoning: string;
  plain_english: string;
  confidence: Confidence;
  severity: Severity;
  observation_ref: string;  // Reference to which observation triggered this violation
}

// Enforcement contact from DynamoDB
export interface EnforcementContact {
  jurisdiction: string;
  contact_type: string;
  display_name: string;
  method: string;
  phone?: string;
  website?: string;
  address?: string;
  hours?: string;
  notes?: string;
}

// Evidence log for documentation
export interface EvidenceLog {
  timestamp: string;  // ISO 8601 format
  location: string;   // Property address
  photo_reference: string;  // S3 key
}

// Housing code entry from DynamoDB
export interface HousingCodeEntry {
  category: string;
  code_section: string;
  code_display: string;
  title: string;
  requirement_text: string;
  plain_english: string;
  jurisdiction: string;
}

// Stage 1 Input (from orchestrator)
export interface Stage1Input {
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 1 Output → Stage 2 Input
export interface Stage1Output {
  observations: Observation[];
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 2 Input (same as Stage1Output)
export type Stage2Input = Stage1Output;

// Stage 2 Output → Stage 3 Input
export interface Stage2Output {
  violations: Violation[];
  observations: Observation[];  // Pass through from Stage 1
  photoKey: string;
  address: string;
  jurisdiction: string;
}

// Stage 3 Input (same as Stage2Output)
export type Stage3Input = Stage2Output;

// Stage 3 Output (Final API Response)
export interface Stage3Output {
  observations: Observation[];
  violations: Violation[];
  complaint_letter: string;
  evidence_log: EvidenceLog;
  contacts: EnforcementContact[];
}
