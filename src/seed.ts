// Starter library: common lifts, mobility drills, stretches and home HIIT moves.
// Marked as sample so they can be removed in Settings. Cues are short reminders, not coaching.
import type { Entry, Kind, MuscleRef, Role, Routine } from './types'
import { defaultMeasure } from './taxonomy'

const ROLE: Record<string, Role> = { P: 'primary', S: 'secondary', T: 'stabiliser' }

function e(
  id: string,
  name: string,
  kind: Kind,
  regions: string,
  muscles: string,
  equipment: string,
  pattern: string,
  cues: string[],
  opts: { compound?: boolean; measure?: Entry['measure'] } = {},
): Entry {
  const m: MuscleRef[] = muscles
    .split(',')
    .filter(Boolean)
    .map((s) => {
      const [r, n] = s.split(':')
      return { name: n.trim(), role: ROLE[r.trim()] }
    })
  return {
    id,
    name,
    kind,
    measure: opts.measure ?? defaultMeasure(kind),
    regions: regions.split(',').map((s) => s.trim()),
    muscles: m,
    equipment: equipment ? equipment.split(',').map((s) => s.trim()) : [],
    pattern: pattern || undefined,
    compound: opts.compound,
    cues,
    photos: [],
    links: [],
    notes: [],
    pinnedSwaps: [],
    sample: true,
    createdAt: 0,
    updatedAt: 0,
  }
}

const C = { compound: true }
const BW = { measure: 'reps' as const }
const BWC = { compound: true, measure: 'reps' as const }

export const SEED_ENTRIES: Entry[] = [
  // Chest
  e('bench-press', 'Barbell bench press', 'strength', 'Chest', 'P:Pec major,S:Front delt,S:Triceps,T:Serratus anterior', 'Barbell,Bench,Rack', 'Horizontal push', ['Shoulder blades pinned back and down', 'Arch upper back, feet driving into floor', 'Bar to lower chest, elbows about 45°', 'Wrists stacked over elbows'], C),
  e('db-bench-press', 'Dumbbell bench press', 'strength', 'Chest', 'P:Pec major,S:Front delt,S:Triceps', 'Dumbbell,Bench', 'Horizontal push', ['Kick dumbbells up off knees to start', 'Shoulder blades back, slight arch', 'Lower to chest level, forearms vertical', 'Press up and slightly in'], C),
  e('incline-db-press', 'Incline dumbbell press', 'strength', 'Chest,Shoulders', 'P:Pec major,S:Front delt,S:Triceps', 'Dumbbell,Bench', 'Incline push', ['Bench at 30°, not steeper', 'Elbows under wrists, about 45°', 'Lower to upper chest'], C),
  e('machine-chest-press', 'Machine chest press', 'strength', 'Chest', 'P:Pec major,S:Front delt,S:Triceps', 'Machine', 'Horizontal push', ['Seat so handles line up with mid chest', 'Shoulder blades against the pad', 'Control the return, no bouncing'], C),
  e('smith-bench', 'Smith machine bench press', 'strength', 'Chest', 'P:Pec major,S:Front delt,S:Triceps', 'Smith machine,Bench', 'Horizontal push', ['Bench placed so bar meets lower chest', 'Same arch and blade position as barbell'], C),
  e('push-up', 'Push-up', 'strength', 'Chest', 'P:Pec major,S:Triceps,S:Front delt,T:Rectus abdominis,T:Serratus anterior', 'Bodyweight', 'Horizontal push', ['Body in one line, glutes squeezed', 'Hands under shoulders, elbows about 45°', 'Chest to fist height'], BWC),
  e('cable-fly', 'Cable fly', 'strength', 'Chest', 'P:Pec major,S:Front delt', 'Cable', 'Chest fly', ['Soft bend in elbows, keep it fixed', 'Hug a tree, hands meet at chest height', 'Stretch without shoulders rolling forward']),
  e('pec-deck', 'Pec deck', 'strength', 'Chest', 'P:Pec major,S:Front delt', 'Machine', 'Chest fly', ['Handles at chest height', 'Squeeze 1 second at the middle']),
  // Back
  e('bb-row', 'Barbell bent-over row', 'strength', 'Upper back', 'P:Lats,P:Mid trapezius,S:Rhomboids,S:Biceps,T:Erector spinae', 'Barbell', 'Horizontal pull', ['Hinge to about 45°, neutral spine', 'Pull bar to lower ribs', 'Elbows back, not out'], C),
  e('db-row', 'One-arm dumbbell row', 'strength', 'Upper back', 'P:Lats,S:Rhomboids,S:Biceps', 'Dumbbell,Bench', 'Horizontal pull', ['Flat back, hand and knee on bench', 'Pull elbow toward hip', 'No torso twist'], C),
  e('cable-row', 'Seated cable row', 'strength', 'Upper back', 'P:Lats,P:Mid trapezius,S:Rhomboids,S:Biceps', 'Cable', 'Horizontal pull', ['Tall chest, slight knee bend', 'Lead with elbows, squeeze blades', 'Let shoulders reach forward on return'], C),
  e('machine-row', 'Chest-supported machine row', 'strength', 'Upper back', 'P:Mid trapezius,P:Rhomboids,S:Lats,S:Rear delt', 'Machine', 'Horizontal pull', ['Chest stays on pad', 'Pause with blades squeezed'], C),
  e('lat-pulldown', 'Lat pulldown', 'strength', 'Upper back', 'P:Lats,S:Biceps,S:Lower trapezius', 'Cable,Machine', 'Vertical pull', ['Thighs locked under pad', 'Slight lean back, chest up', 'Bar to upper chest, elbows down and in'], C),
  e('pull-up', 'Pull-up', 'strength', 'Upper back', 'P:Lats,S:Biceps,S:Lower trapezius,T:Rectus abdominis', 'Pull-up bar', 'Vertical pull', ['Start from a dead hang, shoulders set', 'Chest toward bar', 'Full lockout at the bottom'], BWC),
  e('straight-arm-pulldown', 'Straight-arm cable pulldown', 'strength', 'Upper back', 'P:Lats,S:Teres major', 'Cable', 'Vertical pull', ['Arms long, slight elbow bend', 'Sweep bar to thighs', 'Ribs down, no lower-back arch']),
  // Shoulders
  e('ohp', 'Overhead barbell press', 'strength', 'Shoulders', 'P:Front delt,S:Side delt,S:Triceps,T:Rectus abdominis', 'Barbell,Rack', 'Vertical push', ['Squeeze glutes, ribs down', 'Bar path close to face, head through at top', 'Lock out over mid foot'], C),
  e('db-shoulder-press', 'Seated dumbbell shoulder press', 'strength', 'Shoulders', 'P:Front delt,S:Side delt,S:Triceps', 'Dumbbell,Bench', 'Vertical push', ['Back on pad, ribs down', 'Elbows slightly forward of body', 'Press to just short of touching'], C),
  e('machine-shoulder-press', 'Machine shoulder press', 'strength', 'Shoulders', 'P:Front delt,S:Side delt,S:Triceps', 'Machine', 'Vertical push', ['Handles start at chin height', 'Do not shrug at the top'], C),
  e('lateral-raise', 'Dumbbell lateral raise', 'strength', 'Shoulders', 'P:Side delt,S:Upper trapezius', 'Dumbbell', 'Shoulder raise', ['Lead with elbows, slight bend', 'Raise to shoulder height, no shrug', 'Slow on the way down']),
  e('cable-lateral-raise', 'Cable lateral raise', 'strength', 'Shoulders', 'P:Side delt', 'Cable', 'Shoulder raise', ['Cable from low pulley behind body', 'Stop at shoulder height']),
  e('face-pull', 'Face pull', 'strength', 'Shoulders,Upper back', 'P:Rear delt,S:Rotator cuff,S:Mid trapezius', 'Cable,Band', 'Rear delt', ['Rope at eye height', 'Pull to face, thumbs back', 'Finish in a double biceps pose']),
  // Legs
  e('back-squat', 'Barbell back squat', 'strength', 'Thighs,Hips and glutes', 'P:Quads,P:Glute max,S:Adductors,T:Erector spinae', 'Barbell,Rack', 'Squat', ['Brace before you descend', 'Knees track over toes', 'Hips and chest rise together'], C),
  e('goblet-squat', 'Goblet squat', 'strength', 'Thighs,Hips and glutes', 'P:Quads,P:Glute max,S:Adductors', 'Dumbbell,Kettlebell', 'Squat', ['Hold weight at chest, elbows down', 'Sit between your heels', 'Chest tall at the bottom'], C),
  e('leg-press', 'Leg press', 'strength', 'Thighs,Hips and glutes', 'P:Quads,S:Glute max,S:Adductors', 'Machine', 'Squat', ['Feet mid platform, shoulder width', 'Lower back stays on pad', 'Do not lock knees hard'], C),
  e('hack-squat', 'Hack squat machine', 'strength', 'Thighs', 'P:Quads,S:Glute max', 'Machine', 'Squat', ['Back flat on pad', 'Go as deep as hips stay down'], C),
  e('split-squat', 'Bulgarian split squat', 'strength', 'Thighs,Hips and glutes', 'P:Quads,P:Glute max,S:Adductors,T:Glute med', 'Dumbbell,Bench', 'Lunge', ['Front foot far enough that heel stays down', 'Drop the back knee straight down', 'Slight forward lean for more glute'], C),
  e('rdl', 'Romanian deadlift', 'strength', 'Thighs,Hips and glutes', 'P:Hamstrings,P:Glute max,S:Erector spinae', 'Barbell', 'Hinge', ['Soft knees, push hips back', 'Bar slides down thighs', 'Stop when hips stop moving, neutral spine'], C),
  e('db-rdl', 'Dumbbell Romanian deadlift', 'strength', 'Thighs,Hips and glutes', 'P:Hamstrings,P:Glute max,S:Erector spinae', 'Dumbbell', 'Hinge', ['Dumbbells close to legs', 'Hips back, long spine'], C),
  e('hip-thrust', 'Barbell hip thrust', 'strength', 'Hips and glutes', 'P:Glute max,S:Hamstrings', 'Barbell,Bench', 'Hinge', ['Upper back on bench edge', 'Chin tucked, ribs down', 'Shins vertical at the top'], C),
  e('leg-curl', 'Leg curl', 'strength', 'Thighs', 'P:Hamstrings,S:Calves', 'Machine', 'Knee flexion', ['Knee lined up with machine pivot', 'Hips stay on pad']),
  e('leg-extension', 'Leg extension', 'strength', 'Thighs', 'P:Quads', 'Machine', 'Knee extension', ['Knee lined up with pivot', 'Pause at the top']),
  e('calf-raise', 'Standing calf raise', 'strength', 'Lower leg', 'P:Calves,S:Soleus', 'Machine,Dumbbell', 'Calf raise', ['Full stretch at the bottom, pause', 'Up onto the big toe']),
  // Arms
  e('bb-curl', 'Barbell curl', 'strength', 'Arms', 'P:Biceps,S:Brachialis,S:Forearm flexors', 'Barbell', 'Elbow flexion', ['Elbows pinned at sides', 'No hip swing']),
  e('db-curl', 'Dumbbell curl', 'strength', 'Arms', 'P:Biceps,S:Brachialis', 'Dumbbell', 'Elbow flexion', ['Turn palms up as you lift', 'Lower slowly']),
  e('cable-curl', 'Cable curl', 'strength', 'Arms', 'P:Biceps,S:Brachialis', 'Cable', 'Elbow flexion', ['Step back so tension stays at the bottom']),
  e('pushdown', 'Triceps pushdown', 'strength', 'Arms', 'P:Triceps', 'Cable', 'Elbow extension', ['Elbows fixed at sides', 'Full lockout, spread rope at the bottom']),
  e('oh-triceps', 'Overhead dumbbell triceps extension', 'strength', 'Arms', 'P:Triceps', 'Dumbbell', 'Elbow extension', ['Elbows point forward, not out', 'Deep stretch behind head']),
  // Core
  e('plank', 'Plank', 'strength', 'Core', 'P:Rectus abdominis,P:Transversus abdominis,S:Obliques', 'Bodyweight', 'Core', ['Elbows under shoulders', 'Squeeze glutes, tuck pelvis slightly', 'Breathe, do not hold breath'], { measure: 'hold' }),
  e('dead-bug', 'Dead bug', 'strength', 'Core', 'P:Transversus abdominis,S:Rectus abdominis', 'Bodyweight', 'Core', ['Lower back pressed into floor', 'Opposite arm and leg, slow', 'Exhale as limbs extend'], BW),
  e('hanging-knee-raise', 'Hanging knee raise', 'strength', 'Core', 'P:Rectus abdominis,S:Hip flexors', 'Pull-up bar', 'Core', ['Curl pelvis up, not just knees', 'No swinging'], BW),
  e('pallof-press', 'Pallof press', 'strength', 'Core', 'P:Obliques,S:Transversus abdominis', 'Cable,Band', 'Core', ['Stand side-on to the cable', 'Press out, resist rotation, hold 2 s'], BW),
  // Mobility and activation
  e('serratus-wall-slide', 'Serratus wall slide', 'mobility', 'Chest,Shoulders', 'P:Serratus anterior,S:Lower trapezius', 'Foam roller,Bodyweight', '', ['Forearms on wall or roller, ribs down', 'Reach long and slide up, no shrug', 'Let blades wrap around the ribcage at the top']),
  e('push-up-plus', 'Push-up plus', 'warmup', 'Chest,Shoulders', 'P:Serratus anterior', 'Bodyweight', '', ['Arms locked straight', 'Push the floor away at the top', 'Upper back rounds slightly']),
  e('band-pull-apart', 'Band pull-apart', 'warmup', 'Shoulders,Upper back', 'P:Rear delt,P:Rhomboids,S:Mid trapezius', 'Band', '', ['Arms straight at shoulder height', 'Pull band to chest, squeeze blades', 'Ribs down']),
  e('open-book', 'Open-book thoracic rotation', 'mobility', 'Upper back,Core', 'P:Thoracic spine,S:Pec major', 'Bodyweight', '', ['Lie on side, knees stacked at 90°', 'Rotate top arm open, follow with eyes', 'Knees stay together']),
  e('t-spine-extension', 'Thoracic extension over foam roller', 'mobility', 'Upper back', 'P:Thoracic spine', 'Foam roller', '', ['Roller under mid back, hands behind head', 'Extend over it, ribs stay down', 'Move up one segment at a time']),
  e('cat-cow', 'Cat-cow', 'warmup', 'Core,Upper back', 'P:Erector spinae,S:Thoracic spine', 'Bodyweight', '', ['Move one vertebra at a time', 'Breathe in on arch, out on round']),
  e('band-dislocate', 'Band shoulder dislocates', 'warmup', 'Shoulders,Chest', 'P:Rotator cuff,S:Pec minor', 'Band', '', ['Wide grip, arms straight', 'Ribs stay down as band goes overhead', 'Narrow the grip over weeks']),
  e('90-90', '90/90 hip switch', 'mobility', 'Hips and glutes', 'P:Piriformis,P:Glute med,S:Hip flexors', 'Bodyweight', '', ['Both knees at 90°', 'Sit tall, switch sides slowly', 'Use hands only if needed']),
  e('worlds-greatest', "World's greatest stretch", 'warmup', 'Hips and glutes,Upper back', 'P:Hip flexors,S:Thoracic spine,S:Hamstrings', 'Bodyweight', '', ['Long lunge, back knee off floor', 'Elbow to instep, then rotate arm up', 'Straighten front leg to finish']),
  e('glute-bridge', 'Glute bridge', 'warmup', 'Hips and glutes', 'P:Glute max,S:Hamstrings', 'Bodyweight,Band', '', ['Ribs down, push through heels', 'Squeeze glutes 2 s at the top']),
  e('knee-to-wall', 'Knee-to-wall ankle mobilisation', 'mobility', 'Lower leg', 'P:Ankle,S:Soleus', 'Bodyweight', '', ['Heel stays down', 'Knee tracks over second toe', 'Move foot back as range improves']),
  e('deep-squat-hold', 'Deep squat hold', 'mobility', 'Hips and glutes,Lower leg', 'P:Adductors,S:Ankle,S:Glute max', 'Bodyweight', '', ['Heels down, chest tall', 'Elbows push knees out'], { measure: 'hold' }),
  // Stretches
  e('doorway-pec', 'Doorway pec stretch', 'stretch', 'Chest', 'P:Pec major,S:Pec minor', 'Bodyweight', '', ['Forearm on frame, elbow at shoulder height', 'Step through, ribs down', 'No pain in the front of the shoulder']),
  e('cross-body', 'Cross-body shoulder stretch', 'stretch', 'Shoulders', 'P:Rear delt', 'Bodyweight', '', ['Keep shoulder down, away from ear']),
  e('lat-stretch', "Child's pose lat stretch", 'stretch', 'Upper back', 'P:Lats,S:Teres major', 'Bodyweight', '', ['Hips back to heels', 'Walk hands to one side for one lat']),
  e('couch-stretch', 'Couch stretch', 'stretch', 'Hips and glutes,Thighs', 'P:Hip flexors,P:Quads', 'Bodyweight', '', ['Back knee against wall, shin up the wall', 'Squeeze glute of back leg', 'Tall torso, ribs down']),
  e('hip-flexor-stretch', 'Half-kneeling hip flexor stretch', 'stretch', 'Hips and glutes', 'P:Hip flexors', 'Bodyweight', '', ['Tuck pelvis first, then shift forward', 'Reach arm up on kneeling side']),
  e('pigeon', 'Pigeon stretch', 'stretch', 'Hips and glutes', 'P:Piriformis,P:Glute max', 'Bodyweight', '', ['Front shin angled, back leg long', 'Square hips, fold forward slowly']),
  e('hamstring-strap', 'Supine hamstring stretch', 'stretch', 'Thighs', 'P:Hamstrings', 'Band', '', ['Other leg flat on floor', 'Knee straight, pull with strap']),
  e('calf-stretch', 'Wall calf stretch', 'stretch', 'Lower leg', 'P:Calves,S:Soleus', 'Bodyweight', '', ['Back heel down, toes forward', 'Bend back knee to hit soleus']),
  e('neck-side-bend', 'Neck side-bend stretch', 'stretch', 'Neck', 'P:Upper trapezius,S:Levator scapulae', 'Bodyweight', '', ['Opposite shoulder pulled down', 'Gentle hand pressure only']),
  // Home HIIT moves
  e('burpee', 'Burpee', 'hiit', 'Full body', 'P:Conditioning,S:Quads,S:Pec major', 'Bodyweight', '', ['Hands down, jump back to plank', 'Chest to floor optional', 'Jump with hands overhead']),
  e('jumping-jack', 'Jumping jacks', 'hiit', 'Full body', 'P:Conditioning,S:Calves', 'Bodyweight', '', ['Land soft on the balls of the feet']),
  e('mountain-climber', 'Mountain climbers', 'hiit', 'Core,Full body', 'P:Conditioning,S:Rectus abdominis,S:Hip flexors', 'Bodyweight', '', ['Shoulders over wrists', 'Hips level, drive knees fast']),
  e('squat-jump', 'Squat jumps', 'hiit', 'Thighs', 'P:Quads,S:Glute max,S:Calves', 'Bodyweight', '', ['Squat to parallel', 'Land soft, straight into next rep']),
  e('high-knees', 'High knees', 'hiit', 'Full body', 'P:Conditioning,S:Hip flexors', 'Bodyweight', '', ['Knees to hip height', 'Pump arms']),
  e('reverse-lunge', 'Alternating reverse lunge', 'hiit', 'Thighs,Hips and glutes', 'P:Quads,P:Glute max', 'Bodyweight,Dumbbell', '', ['Step back, back knee just off floor', 'Front knee over mid foot']),
  e('shoulder-taps', 'Plank shoulder taps', 'hiit', 'Core,Shoulders', 'P:Obliques,S:Front delt', 'Bodyweight', '', ['Feet wide, hips do not rock']),
  e('skater', 'Skater hops', 'hiit', 'Hips and glutes,Thighs', 'P:Glute med,S:Quads', 'Bodyweight', '', ['Land on one leg, stick it briefly', 'Reach opposite hand to foot']),
  e('db-thruster', 'Dumbbell thruster', 'hiit', 'Full body,Shoulders,Thighs', 'P:Quads,P:Front delt,S:Glute max,S:Triceps', 'Dumbbell', '', ['Front squat, drive up and press in one move', 'Ribs down at lockout']),
  e('kb-swing', 'Kettlebell swing', 'hiit', 'Hips and glutes', 'P:Glute max,P:Hamstrings,S:Erector spinae', 'Kettlebell,Dumbbell', '', ['Hinge, not squat', 'Snap hips, bell floats to chest height', 'Plank at the top']),
]

const r = (entryId: string, sets: number, reps?: number, hold?: number) => ({ entryId, sets, reps, hold })

export const SEED_ROUTINES: Routine[] = [
  {
    id: 'r-chest-back',
    name: 'Chest and back',
    type: 'gym',
    items: [r('bench-press', 4, 8), r('bb-row', 4, 8), r('incline-db-press', 3, 10), r('lat-pulldown', 3, 10), r('cable-fly', 3, 12), r('face-pull', 3, 15)],
    sample: true,
    updatedAt: 0,
  },
  {
    id: 'r-legs',
    name: 'Legs',
    type: 'gym',
    items: [r('back-squat', 4, 6), r('rdl', 3, 8), r('split-squat', 3, 10), r('leg-curl', 3, 12), r('calf-raise', 3, 12)],
    sample: true,
    updatedAt: 0,
  },
  {
    id: 'r-shoulders-arms',
    name: 'Shoulders and arms',
    type: 'gym',
    items: [r('ohp', 4, 6), r('lateral-raise', 3, 15), r('face-pull', 3, 15), r('bb-curl', 3, 10), r('pushdown', 3, 12)],
    sample: true,
    updatedAt: 0,
  },
  {
    id: 'r-upper-mobility',
    name: 'Upper body warm-up, 8 min',
    type: 'mobility',
    items: [r('t-spine-extension', 2, 8), r('serratus-wall-slide', 2, 10), r('band-pull-apart', 2, 15), r('band-dislocate', 2, 10), r('doorway-pec', 2, undefined, 30)],
    sample: true,
    updatedAt: 0,
  },
  {
    id: 'r-hips-ankles',
    name: 'Hips and ankles, 10 min',
    type: 'mobility',
    items: [r('90-90', 2, 8), r('worlds-greatest', 2, 5), r('knee-to-wall', 2, 10), r('couch-stretch', 2, undefined, 45), r('deep-squat-hold', 2, undefined, 45)],
    sample: true,
    updatedAt: 0,
  },
  {
    id: 'r-home-hiit',
    name: 'Home HIIT, 20 min',
    type: 'hiit',
    items: [r('burpee', 1), r('squat-jump', 1), r('mountain-climber', 1), r('reverse-lunge', 1), r('shoulder-taps', 1)],
    hiit: { work: 40, rest: 20, rounds: 4 },
    sample: true,
    updatedAt: 0,
  },
]
