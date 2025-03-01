# NIP-XX: Workout Events

`draft` `optional`

This specification defines workout events for fitness tracking. These workout events support both planning (templates) and recording (completed activities).

## Event Kinds

### Event Kind Selection Rationale

The event kinds in this NIP follow Nostr protocol conventions:

- **Exercise and Workout Templates** (33401, 33402) use parameterized replaceable event kinds (30000+) because:
  - They represent content that may be updated or improved over time
  - The author may want to replace previous versions with improved ones
  - They need the `d` parameter to distinguish between different templates by the same author
  - Multiple versions shouldn't accumulate in clients' storage

- **Workout Records** (1301) use a standard event kind (0-9999) because:
  - They represent a chronological feed of activity that shouldn't replace previous records
  - Each workout is a unique occurrence that adds to a user's history
  - Users publish multiple records over time, creating a timeline
  - They're conceptually similar to notes (kind 1) but with structured fitness data

### Exercise Template (kind: 33401)
Defines reusable exercise definitions. These should remain public to enable discovery and sharing. The `content` field contains detailed form instructions and notes.

#### Required Tags
* `d` - UUID for template identification
* `title` - Exercise name
* `format` - Defines data structure for exercise tracking (possible parameters: `weight`, `reps`, `rpe`, `set_type`)
* `format_units` - Defines units for each parameter (possible formats: "kg", "count", "0-10", "warmup|normal|drop|failure")
* `equipment` - Equipment type (possible values: `barbell`, `dumbbell`, `bodyweight`, `machine`, `cardio`)

#### Optional Tags
* `difficulty` - Skill level (possible values: `beginner`, `intermediate`, `advanced`)
* `imeta` - Media metadata for form demonstrations following NIP-92 format
* `t` - Hashtags for categorization such as muscle group or body movement (possible values: `chest`, `legs`, `push`, `pull`)

### Workout Template (kind: 33402)
Defines a complete workout plan. The `content` field contains workout notes and instructions. Workout templates can prescribe specific parameters while leaving others configurable by the user performing the workout.

#### Required Tags
* `d` - UUID for template identification
* `title` - Workout name
* `type` - Type of workout (possible values: `strength`, `circuit`, `emom`, `amrap`)
* `exercise` - Exercise reference and prescription. Format: ["exercise", "kind:pubkey:d-tag", "relay-url", ...parameters matching exercise template format]

#### Optional Tags
* `rounds` - Number of rounds for repeating formats
* `duration` - Total workout duration in seconds
* `interval` - Duration of each exercise portion in seconds (for timed workouts)
* `rest_between_rounds` - Rest time between rounds in seconds
* `t` - Hashtags for categorization

### Workout Record (kind: 1301)
Records a completed workout session. The `content` field contains notes about the workout.

#### Required Tags
* `d` - UUID for record identification
* `title` - Workout name
* `type` - Type of workout (possible values: `strength`, `circuit`, `emom`, `amrap`)
* `exercise` - Exercise reference and completion data. Format: ["exercise", "kind:pubkey:d-tag", "relay-url", ...parameters matching exercise template format]
* `start` - Unix timestamp in seconds for workout start
* `end` - Unix timestamp in seconds for workout end
* `completed` - Boolean indicating if workout was completed as planned

#### Optional Tags
* `rounds_completed` - Number of rounds completed
* `interval` - Duration of each exercise portion in seconds (for timed workouts)
* `template` - Reference to the workout template used, if any. Format: ["template", "33402:<pubkey>:<d-tag>", "<relay-url>"]
* `pr` - Personal Record achieved during workout. Format: "kind:pubkey:d-tag,metric,value". Used to track when a user achieves their best performance for a given exercise and metric (e.g., heaviest weight lifted, most reps completed, fastest time)
* `t` - Hashtags for categorization

## Exercise Parameters

### Standard Parameters and Units
* `weight` - Load in kilograms (kg). Empty string for bodyweight exercises, negative values for assisted exercises
* `reps` - Number of repetitions (count)
* `rpe` - Rate of Perceived Exertion (0-10):
  - RPE 10: Could not do any more reps, technical failure
  - RPE 9: Could maybe do 1 more rep
  - RPE 8: Could definitely do 1 more rep, maybe 2
  - RPE 7: Could do 2-3 more reps
* `duration` - Time in seconds
* `set_type` - Set classification (possible values: `warmup`, `normal`, `drop`, `failure`)

Additional parameters can be defined in exercise templates in the `format_units` tag as needed for specific activities (e.g., distance, heartrate, intensity).

## Workout Types and Terminology

This specification provides examples of common workout structures but is not limited to these types. The format is extensible to support various training methodologies while maintaining consistent data structure.

### Common Workout Types

#### Strength
Traditional strength training focusing on sets and reps with defined weights. Typically includes warm-up sets, working sets, and may include techniques like drop sets or failure sets.

#### Circuit
Multiple exercises performed in sequence with minimal rest between exercises and defined rest periods between rounds. Focuses on maintaining work rate through prescribed exercises.

#### EMOM (Every Minute On the Minute)
Time-based workout where specific exercises are performed at the start of each minute. Rest time is whatever remains in the minute after completing prescribed work.

#### AMRAP (As Many Rounds/Reps As Possible)
Time-capped workout where the goal is to complete as many rounds or repetitions as possible of prescribed exercises while maintaining proper form.

## Set Types

### Normal Sets
Standard working sets that count toward volume and progress tracking.

### Warm-up Sets
Preparatory sets using submaximal weights. These sets are not counted in metrics or progress tracking.

### Drop Sets
Sets performed immediately after a working set with reduced weight. These are counted in volume calculations but tracked separately for progress analysis.

### Failure Sets
Sets where technical failure was reached before completing prescribed reps. These sets are counted in metrics but marked to indicate intensity/failure was reached.

## Examples

### Exercise Template
```json
{
  "kind": 33401,
  "content": "Stand with feet hip-width apart, barbell over midfoot. Hinge at hips, grip bar outside knees. Flatten back, brace core. Drive through floor, keeping bar close to legs.\n\nForm demonstration: https://powr.me/exercises/deadlift-demo.mp4",
  "tags": [
    ["d", "bb-deadlift-template"],
    ["title", "Barbell Deadlift"],
    ["format", "weight", "reps", "rpe", "set_type"],
    ["format_units", "kg", "count", "0-10", "warmup|normal|drop|failure"],
    ["equipment", "barbell"],
    ["difficulty", "intermediate"],
    ["imeta", 
      "url https://powr.me/exercises/deadlift-demo.mp4",
      "m video/mp4",
      "dim 1920x1080",
      "alt Demonstration of proper barbell deadlift form"
    ],
    ["t", "compound"],
    ["t", "legs"],
    ["t", "posterior"]
  ]
}
```

### EMOM Workout Template
```json
{
  "kind": 33402,
  "content": "20 minute EMOM alternating between squats and deadlifts every 30 seconds. Scale weight as needed to complete all reps within each interval.",
  "tags": [
    ["d", "lower-body-emom-template"],
    ["title", "20min Squat/Deadlift EMOM"],
    ["type", "emom"],
    ["duration", "1200"],
    ["rounds", "20"],
    ["interval", "30"],
    
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-back-squat-template", "wss://powr.me", "", "5", "7", "normal"],
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-deadlift-template", "wss://powr.me", "", "4", "7", "normal"],
    
    ["t", "conditioning"],
    ["t", "legs"]
  ]
}
```

### Circuit Workout Record
```json
{
  "kind": 1301,
  "content": "Completed first round as prescribed. Second round showed form deterioration on deadlifts.",
  "tags": [
    ["d", "workout-20250128"],
    ["title", "Leg Circuit"],
    ["type", "circuit"],
    ["rounds_completed", "1.5"],
    ["start", "1706454000"],
    ["end", "1706455800"],
    
    // Round 1 - Completed as prescribed
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-back-squat-template", "wss://powr.me", "80", "12", "7", "normal"],
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-deadlift-template", "wss://powr.me", "100", "10", "7", "normal"],
    
    // Round 2 - Failed on deadlifts
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-back-squat-template", "wss://powr.me", "80", "12", "8", "normal"],
    ["exercise", "33401:9947f9659dd80c3682402b612f5447e28249997fb3709500c32a585eb0977340:bb-deadlift-template", "wss://powr.me", "100", "4", "10", "failure"],
    
    ["completed", "false"],
    ["t", "legs"]
  ]
}
```

## Implementation Guidelines

1. All workout records SHOULD include accurate start and end times
2. Templates MAY prescribe specific parameters while leaving others as empty strings for user input
3. Records MUST include actual values for all parameters defined in exercise format
4. Failed sets SHOULD be marked with `failure` set_type
5. Records SHOULD be marked as `false` for completed if prescribed work wasn't completed
6. PRs SHOULD only be tracked in workout records, not templates
7. Exercise references SHOULD use the format "kind:pubkey:d-tag" to ensure proper attribution and versioning

## References

This NIP draws inspiration from:
- [NIP-01: Basic Protocol Flow Description](https://github.com/nostr-protocol/nips/blob/master/01.md)
- [NIP-92: Media Attachments](https://github.com/nostr-protocol/nips/blob/master/92.md#nip-92)