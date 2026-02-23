export const HELP_TEXT = {
  scoutPaste: {
    title: "Scout Paste Format",
    content: `Paste your scout report here. The calculator will automatically extract troop counts and stat bonuses.

Example format:
Apex Infantry
81,791
Infantry Attack: +150%
Infantry Defense: +120%

Truegold Cavalry
45,200
Cavalry Attack: +140%`
  },
  
  counterMechanics: {
    title: "Counter System",
    content: `Infantry > Cavalry (+12% effectiveness)
Cavalry > Archers (+12% effectiveness)
Archers > Infantry (+12% effectiveness)

These bonuses are mild - your stats still dominate the outcome.`
  },
  
  rngSkills: {
    title: "RNG Skills by Tier/TG",
    content: `Archers T7+: Volley (10% chance to strike twice)
Archers TG3+: Howling Wind (20% chance +50% damage)
Cavalry TG3+: Assault Lance (10% chance double damage)
Cavalry T7+: Backline Strike (20% chance to target archers)
Infantry TG3+: Shield (25% chance damage mitigation)`
  },
  
  specialBonuses: {
    title: "Special Bonuses Format",
    content: `Two-column layout:
Left column = Your bonuses
Right column = Enemy bonuses

Example:
Squads' Attack Bonus
+15%  +10%

Enemy Lethality Penalty
-8%

Attack Bonus (Pet Skill)
+12%`
  },
  
  battleTypes: {
    title: "Battle Type Effects",
    content: `Solo PvP (Attack / Defense): Standard 1v1 combat
- Intensity: 0.95 (moderate decisiveness)
- Skill Factor: 1.00x (baseline)

Rally Attack: Multiple players attacking together
- Intensity: 1.05 (more decisive)
- Skill Factor: 1.15x (Rally initiator + member hero skills)

Garrison Defense: Defending a garrison
- Intensity: 1.00 (balanced)
- Skill Factor: 1.12x (Garrison bonuses)

Outpost / Sanctuary / Fortress Battle: Facility combat
- Intensity: 1.00 (balanced)
- Skill Factor: 1.12x (Facility combat effects)

Intensity controls how "snowbally" outcomes feel.
Skill Factor multiplies hero skill effectiveness.`
  },
  
  tierSelection: {
    title: "Tier & TG Selection",
    content: `Tier: T1 to T11 (affects RNG skills at T7+)
TG: TG0 to TG5 (affects RNG skills at TG3+)

Higher tiers unlock powerful RNG abilities that can swing battles.`
  },

  marchSize: {
    title: "March Size",
    content: `The total number of troops you'll send into battle.

If you paste your scout report in "My Troops", the march size will be auto-filled from your troop totals.

You can also manually enter a march size to test different scenarios.`
  },

  targetWin: {
    title: "Target Win Percentage",
    content: `Optional: Set a desired win probability (e.g., 80%).

The calculator will determine the minimum march size needed to achieve this win rate.

Leave blank to calculate win probability for your current march size.`
  }
};
