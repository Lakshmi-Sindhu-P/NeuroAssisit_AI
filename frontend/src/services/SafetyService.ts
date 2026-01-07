
interface Interaction {
    drugs: string[];
    severity: "CONTRAINDICATION" | "CAUTION";
    message: string;
}

const KNOWN_INTERACTIONS: Interaction[] = [
    { drugs: ["warfarin", "aspirin"], severity: "CONTRAINDICATION", message: "Increased risk of bleeding." },
    { drugs: ["levodopa", "metoclopramide"], severity: "CONTRAINDICATION", message: "Metoclopramide antagonizes effects of Levodopa." },
    { drugs: ["sildenafil", "nitrates"], severity: "CONTRAINDICATION", message: "Hypotension risk." },
    { drugs: ["coq10", "warfarin"], severity: "CAUTION", message: "CoQ10 may decrease Warfarin effectiveness." },
    { drugs: ["penicillin"], severity: "CONTRAINDICATION", message: "Patient has Penicillin allergy." } // Handling allergies as single-drug "interactions" against patient profile
];

export const SafetyService = {
    checkInteractions: (prescribedDrugs: string[], patientMeds: string[], patientAllergies: string[]) => {
        const warnings: any[] = [];
        const allDrugs = [...prescribedDrugs.map(d => d.toLowerCase()), ...patientMeds.map(d => d.toLowerCase())];
        const allergies = patientAllergies.map(a => a.toLowerCase());

        // Check Allergies
        prescribedDrugs.forEach(drug => {
            const d = drug.toLowerCase();
            allergies.forEach(allergy => {
                if (d.includes(allergy) || allergy.includes(d)) {
                    warnings.push({
                        type: "CONTRAINDICATION",
                        drug: drug,
                        message: `Patient is allergic to ${allergy}.`
                    });
                }
            });
        });

        // Check Drug-Drug
        KNOWN_INTERACTIONS.forEach(interaction => {
            // Check if BOTH items in interaction exist in allDrugs
            // Usually interactions are pair-wise.
            // If interaction.drugs has 1 item, it's global? No, assuming pairs for now.

            if (interaction.drugs.length === 2) {
                const [d1, d2] = interaction.drugs;
                const hasD1 = allDrugs.some(ad => ad.includes(d1));
                const hasD2 = allDrugs.some(ad => ad.includes(d2));

                if (hasD1 && hasD2) {
                    // Ensure at least one is NEWLY prescribed (don't flag existing stable pairs unless we want to)
                    // Implementation: Flag anyway for safety.
                    warnings.push({
                        type: interaction.severity,
                        drug: `${d1} + ${d2}`,
                        message: interaction.message
                    });
                }
            }
        });

        return warnings;
    }
};
