import { supabaseService } from './src/supabaseService.ts';

async function main() {
    console.log("Starting member sync...");
    try {
        await supabaseService.syncMembers();
        console.log("Successfully synced all members!");
    } catch (e) {
        console.error("Failed to sync:", e);
    }
}

main();
