# Design
Experience mode: a real 3D evening street is the primary surface. No marketing page.
The user-pinned world is 1990s Vietnamese street life. Visual direction: the neighbourhood chalk menu (fourth of seven grounded directions: enamel street sign, handwritten receipt, shutter shop, chalk menu, radio dial, family album, school notebook). Ochre storefronts, deep teal evening, cream paper, vermilion actions, tactile rounded controls. All controls keep Vietnamese native words and keyboard focus. Lora bold is the signage voice, Be Vietnam Pro is the interface voice. Canvas geometry owns scenery; CSS owns UI. No fabricated guests or chat history.
The concept roll ran degraded; its challenger service was unavailable. The explicit user brief governs the built world. Code-first because this is an interactive game.

## Updated visual direction — 03/11/2026
User supplied a screenshot of Sanasa Temple as a style reference: tactile, photographed environment materials, small rounded humanoid, a lower third-person follow camera and natural gestures. Keep the Vietnamese tavern setting and existing UI; do not copy website assets. Use local Poly Haven CC0 PBR diffuse/OpenGL normal/roughness maps (1K), restrained warm/cool lighting and real metal/glass material response. Character geometry is original procedural geometry, smoothly rounded with articulated shoulders, elbows, hips and knees. Foot stance derives from distance traveled; cheers grabs a visible personal virtual beer mug, lifts/extends it toward the table and puts it back. Preserve instancing and the low quality option. This is an improvement toward the reference, not a photorealistic human scan or motion capture.

## Continuous character skin and mouth-targeted drinking
Replace separate upper/lower limb capsules with one smooth surface per limb, following the internal shoulder/elbow/wrist or hip/knee/ankle controls. No joint meshes are displayed. Shirt sleeves end above the elbow; trouser skin stays continuous through the knee. The torso uses a shaped clothing profile rather than an inflated sphere. Drinking has a visible mouth anchor: the glass's near rim is constrained to it, and the glass tilts around that contact while the hand remains on the handle. Keep the existing server timeline and instancing.

## Upright posture correction
The user's side-view screenshot showed a crouched silhouette. Use nearly extended knees and elbows at idle, hips over the supporting leg, hands hanging below the waist. Walking uses a short, low swing and opposite arm swing; loaded legs should read extended, with brief normal flexion during weight transfer. Keep internal joints and the continuous outer skin.

## Social / stage extension
Extend the Vietnamese evening tavern with a 16 × 8 raised stage behind all 17 courtyard tables, with walkable ramps on both sides, rear-corner speakers and a warm/cool four-fixture truss with its sign above head height. This is the localized dance area the user requested; the rest of the quán keeps its existing character. UI adds compact carry/social/dance actions and a stage sidebar; no full-screen panel during play. Seven visibly different dances share the beat, including energetic hiphop, krump and running man. Intoxication uses a progressive blush, small overhead markers and restrained upper-body sway; preserve reliable controls and reduced-motion behavior.

The arrival sequence is road → wide gate beside reception → courtyard tables → rear stage. New arrivals spawn on the road; reconnecting guests keep their existing position. Six original procedural motorcycles alternate slim sport profiles inspired by Xì-po and upright step-through profiles inspired by Dream: spoked wheels, engine, exhaust, seat, mirrors, lights and leg shields. They are parked scenery, with no driving mechanic. WC sits in the rear-left service corner with a walk-through doorway, toilet and wash basin; reception is a physical welcome counter with a ledger/lamp. Geometry is original; no copied logos or third-party vehicle models. Keep the existing Vietnamese evening materials and warning notices.

The stage has two unobstructed side ramps. A seated viewing action aims the camera at the stage without moving the player or changing their seat. Cream/vermilion and teal/cream enamel notices carry the age restriction, no-driving-after-drinking message and a reminder to keep order.

## Sign separation / timed intoxication / smoking gesture
User screenshot showed the rear shop title and motto behind the stage truss lettering. Remove those duplicate rear boards; keep the single shop title at the entrance and the stage title on its own truss. Existing menu and safety notices remain in their separate locations.

The explicit user update replaces the formerly cosmetic-only sway with ten capped stages of virtual intoxication: blush first, progressively staggered/slower movement and hands-and-knees crawling at level 10. Natural recovery drops one level per quiet minute and keeps the completed drink total. Keep upright normal walking when sober, seated poses and mouth-contact sipping. The smoking gesture has an unbranded cigarette raised to the mouth, a small ember and restrained smoke; no haze overlay or promotional treatment. Reduced motion hides smoke puffs and nonessential sway.

## Compact names / vomiting gesture
User screenshot shows an oversized name badge above the crawling character. Reduce projected nameplate scale and tighten type/padding while retaining names and status. Add a manual Nôn action at current intoxication level 5+, including seated and crawling poses. Use a brief forward bend and sparse stylized droplets; keep it local to the character and preserve reduced motion.

Smoking exhale refinement: visible smoke originates at the mouth after inhaling and lowering the cigarette, rather than following the ember. Three translucent clouds travel forward, lift, expand and dissipate within the existing gesture duration. Reduced motion continues to hide the particles.

## Character selection / running / NPC reception
Expand the existing rounded original characters into eight clothed presets (four male, four female) and six facial proportions, using the same continuous limbs and hidden joints. Female presets have bob, long, ponytail and bun silhouettes; keep dress and presentation within the established quán. A compact foldout before entry and the in-room character modal share native selects, labeled range controls and an actual rotatable 3D preview. Height and weight change visible proportions; preserve mouth contact and adapt occupied stools for seating.

Running is a deliberate Shift/touch toggle, with higher step and opposite arm swing; intoxicated running has stronger visible and authoritative stagger. Keep crawl level 10. Hạnh is a visible female receptionist behind the entrance counter, clearly labeled NPC, with a dedicated private scripted conversation panel. Preserve room chat and genuine player counts. On narrow layouts, five left-hand tools use a horizontal row to avoid the chat area.

## Rest / private player suggestions
Add a visible Nằm nghỉ toggle near carry/social controls, with an equally clear exit and a low camera/name anchor. Rest is horizontal, supine, and retains the existing original rounded bodies and internal joints. Require free flat space and keep hands/cup states coherent.

Add Góp ý in the top controls, using the existing native modal. A labeled category select, multiline draft, character count, busy/error and durable-success states make sending concrete. Preserve drafts on failed saves and state that nickname/room/time accompany the message. Owner review is a private local standalone report with honest time-window counts, no fabricated popularity, no public disclosure of guest feedback and no contact-data requirement.
