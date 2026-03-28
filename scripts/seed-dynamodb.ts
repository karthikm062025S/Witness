// DynamoDB Seed Script
// Seeds HousingCodes and EnforcementContacts tables with Virginia data

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize DynamoDB client
const dynamodb = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: "us-east-1" })
);

// Get table names from environment variables
const CODES_TABLE = process.env.HOUSING_CODES_TABLE_NAME || "HousingCodes";
const CONTACTS_TABLE = process.env.ENFORCEMENT_CONTACTS_TABLE_NAME || "EnforcementContacts";

/**
 * Batch write items to DynamoDB
 * Handles chunking for 25-item limit
 */
async function batchWriteItems(tableName: string, items: any[]) {
  const BATCH_SIZE = 25;
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    
    try {
      await dynamodb.send(new BatchWriteCommand({
        RequestItems: {
          [tableName]: batch.map(item => ({
            PutRequest: { Item: item }
          }))
        }
      }));
      
      successCount += batch.length;
      console.log(`✓ Wrote ${batch.length} items to ${tableName} (${successCount}/${items.length})`);
    } catch (error) {
      errorCount += batch.length;
      console.error(`✗ Failed to write batch to ${tableName}:`, error);
      // Continue with remaining items
    }
  }
  
  return { successCount, errorCount };
}

/**
 * Seed HousingCodes table
 */
async function seedHousingCodes() {
  console.log("\n📋 Seeding HousingCodes table...");
  
  try {
    // Read housing codes data
    const dataPath = join(__dirname, "../data/housing-codes.json");
    const data = readFileSync(dataPath, "utf-8");
    const codes = JSON.parse(data);
    
    console.log(`Found ${codes.length} housing code entries`);
    
    // Batch write to DynamoDB
    const result = await batchWriteItems(CODES_TABLE, codes);
    
    console.log(`✅ HousingCodes seeding complete: ${result.successCount} success, ${result.errorCount} errors`);
    
    return result;
  } catch (error) {
    console.error("❌ Failed to seed HousingCodes:", error);
    throw error;
  }
}

/**
 * Seed EnforcementContacts table
 */
async function seedEnforcementContacts() {
  console.log("\n📞 Seeding EnforcementContacts table...");
  
  try {
    // Read enforcement contacts data
    const dataPath = join(__dirname, "../data/enforcement-contacts.json");
    const data = readFileSync(dataPath, "utf-8");
    const contacts = JSON.parse(data);
    
    console.log(`Found ${contacts.length} enforcement contact entries`);
    
    // Batch write to DynamoDB
    const result = await batchWriteItems(CONTACTS_TABLE, contacts);
    
    console.log(`✅ EnforcementContacts seeding complete: ${result.successCount} success, ${result.errorCount} errors`);
    
    return result;
  } catch (error) {
    console.error("❌ Failed to seed EnforcementContacts:", error);
    throw error;
  }
}

/**
 * Main seed function
 */
async function main() {
  console.log("🌱 Starting DynamoDB seed process...");
  console.log(`Region: us-east-1`);
  console.log(`HousingCodes table: ${CODES_TABLE}`);
  console.log(`EnforcementContacts table: ${CONTACTS_TABLE}`);
  
  try {
    // Seed both tables
    const codesResult = await seedHousingCodes();
    const contactsResult = await seedEnforcementContacts();
    
    // Summary
    console.log("\n" + "=".repeat(50));
    console.log("📊 Seed Summary:");
    console.log(`  HousingCodes: ${codesResult.successCount} items`);
    console.log(`  EnforcementContacts: ${contactsResult.successCount} items`);
    console.log(`  Total: ${codesResult.successCount + contactsResult.successCount} items`);
    
    if (codesResult.errorCount + contactsResult.errorCount > 0) {
      console.log(`  ⚠️  Errors: ${codesResult.errorCount + contactsResult.errorCount}`);
    }
    
    console.log("=".repeat(50));
    console.log("✅ Seed process complete!");
    
  } catch (error) {
    console.error("\n❌ Seed process failed:", error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { seedHousingCodes, seedEnforcementContacts };
