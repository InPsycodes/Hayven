import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { SkillDomainType } from "@/lib/therapy-sessions/types";

const PROMPT_LEVELS = [
  { value: "independent", label: "Independent" },
  { value: "gestural", label: "Gestural" },
  { value: "verbal", label: "Verbal" },
  { value: "partial_physical", label: "Partial physical" },
  { value: "full_physical", label: "Full physical" },
];

const FUNCTIONAL_INDEPENDENCE_ACTIVITIES = [
  { value: "toileting", label: "Toileting" },
  { value: "feeding", label: "Feeding" },
  { value: "dressing", label: "Dressing" },
  { value: "hand_washing", label: "Hand washing" },
  { value: "personal_hygiene", label: "Personal hygiene" },
  { value: "transitioning", label: "Transitioning" },
  { value: "other", label: "Other" },
];

const COMMUNICATION_MODALITIES = [
  { value: "vocalization", label: "Vocalization" },
  { value: "gesture", label: "Gesture" },
  { value: "sign", label: "Sign" },
  { value: "aac", label: "AAC" },
  { value: "eye_gaze", label: "Eye gaze" },
  { value: "other", label: "Other" },
];

const INDEPENDENCE_LEVELS = [
  { value: "independent", label: "Independent" },
  { value: "minimal_prompting", label: "Minimal prompting" },
  { value: "moderate_prompting", label: "Moderate prompting" },
  { value: "maximum_prompting", label: "Maximum prompting" },
];

/** Shared prompt-level select -- reused by every domain preset that maps onto the existing generic prompt_level column instead of needing its own. */
function PromptLevelField({ skillId }: { skillId: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={`skill_${skillId}_prompt`} className="text-xs">
        Prompt level
      </Label>
      <select
        id={`skill_${skillId}_prompt`}
        name={`skill_${skillId}_prompt`}
        className="h-9 rounded-sm border border-border bg-white px-2 text-sm"
        defaultValue=""
      >
        <option value="">Not recorded</option>
        {PROMPT_LEVELS.map((p) => (
          <option key={p.value} value={p.value}>
            {p.label}
          </option>
        ))}
      </select>
    </div>
  );
}

/** The structured fields for a domain-typed skill on the session-entry form -- replaces the generic trials-total/trials-correct inputs for skills where a domain_type is set. */
export function SkillDomainFields({ skillId, domainType }: { skillId: string; domainType: SkillDomainType }) {
  return (
    <div className="flex flex-col gap-3">
      {domainType === "name_response" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_nr_orientation`} className="text-xs">
              Orientation %
            </Label>
            <Input id={`skill_${skillId}_nr_orientation`} name={`skill_${skillId}_nr_orientation`} type="number" min={0} max={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_nr_approach`} className="text-xs">
              Approach %
            </Label>
            <Input id={`skill_${skillId}_nr_approach`} name={`skill_${skillId}_nr_approach`} type="number" min={0} max={100} />
          </div>
        </div>
      )}

      {domainType === "speech_approximation" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_sa_word`} className="text-xs">
              Word / sound
            </Label>
            <Input id={`skill_${skillId}_sa_word`} name={`skill_${skillId}_sa_word`} placeholder="e.g. water" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_sa_approximation`} className="text-xs">
              Child&apos;s approximation
            </Label>
            <Input id={`skill_${skillId}_sa_approximation`} name={`skill_${skillId}_sa_approximation`} placeholder="e.g. &quot;wa&quot;" />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "functional_communication" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_fc_requests`} className="text-xs">
              Requests observed
            </Label>
            <Input
              id={`skill_${skillId}_fc_requests`}
              name={`skill_${skillId}_fc_requests`}
              placeholder="water, biscuit"
            />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "communicative_initiation" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ci_gaze`} className="text-xs">
              Gaze %
            </Label>
            <Input id={`skill_${skillId}_ci_gaze`} name={`skill_${skillId}_ci_gaze`} type="number" min={0} max={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ci_vocalization`} className="text-xs">
              Vocalization %
            </Label>
            <Input id={`skill_${skillId}_ci_vocalization`} name={`skill_${skillId}_ci_vocalization`} type="number" min={0} max={100} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ci_gesture`} className="text-xs">
              Gesture %
            </Label>
            <Input id={`skill_${skillId}_ci_gesture`} name={`skill_${skillId}_ci_gesture`} type="number" min={0} max={100} />
          </div>
        </div>
      )}

      {domainType === "receptive_instructions" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`skill_${skillId}_ri_instruction`} className="text-xs">
              Instruction
            </Label>
            <Input id={`skill_${skillId}_ri_instruction`} name={`skill_${skillId}_ri_instruction`} placeholder="e.g. Pick up" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ri_accuracy`} className="text-xs">
              Accuracy %
            </Label>
            <Input id={`skill_${skillId}_ri_accuracy`} name={`skill_${skillId}_ri_accuracy`} type="number" min={0} max={100} />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "object_identification" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_oi_items`} className="text-xs">
              Items correctly identified
            </Label>
            <Input id={`skill_${skillId}_oi_items`} name={`skill_${skillId}_oi_items`} placeholder="e.g. cup, spoon, ball" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_oi_accuracy`} className="text-xs">
              Accuracy %
            </Label>
            <Input id={`skill_${skillId}_oi_accuracy`} name={`skill_${skillId}_oi_accuracy`} type="number" min={0} max={100} />
          </div>
        </div>
      )}

      {domainType === "concept_understanding" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_cu_concept`} className="text-xs">
              Concept
            </Label>
            <Input id={`skill_${skillId}_cu_concept`} name={`skill_${skillId}_cu_concept`} placeholder="e.g. big vs. small" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_cu_accuracy`} className="text-xs">
              Accuracy %
            </Label>
            <Input id={`skill_${skillId}_cu_accuracy`} name={`skill_${skillId}_cu_accuracy`} type="number" min={0} max={100} />
          </div>
        </div>
      )}

      {domainType === "tacting_naming" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor={`skill_${skillId}_tn_items`} className="text-xs">
              Items labelled
            </Label>
            <Input id={`skill_${skillId}_tn_items`} name={`skill_${skillId}_tn_items`} placeholder="dog, cat, car" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_tn_accuracy`} className="text-xs">
              Accuracy %
            </Label>
            <Input id={`skill_${skillId}_tn_accuracy`} name={`skill_${skillId}_tn_accuracy`} type="number" min={0} max={100} />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "mand_diversity" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_md_words`} className="text-xs">
              New / request words
            </Label>
            <Input id={`skill_${skillId}_md_words`} name={`skill_${skillId}_md_words`} placeholder="more, help, open" />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "motor_speech_dttc" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ms_practised`} className="text-xs">
              Sounds / words practised
            </Label>
            <Input id={`skill_${skillId}_ms_practised`} name={`skill_${skillId}_ms_practised`} placeholder="ba, pa, ma" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_ms_performance`} className="text-xs">
              Performance
            </Label>
            <Input id={`skill_${skillId}_ms_performance`} name={`skill_${skillId}_ms_performance`} placeholder="e.g. Consistent with cueing" />
          </div>
          <PromptLevelField skillId={skillId} />
        </div>
      )}

      {domainType === "functional_independence" && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor={`skill_${skillId}_fi_activity`} className="text-xs">
              Activity
            </Label>
            <select
              id={`skill_${skillId}_fi_activity`}
              name={`skill_${skillId}_fi_activity`}
              className="h-9 rounded-sm border border-border bg-white px-2 text-sm"
              defaultValue=""
            >
              <option value="">Select</option>
              {FUNCTIONAL_INDEPENDENCE_ACTIVITIES.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label className="text-xs">Communication used</Label>
            <div className="flex flex-wrap gap-3 pt-1 text-xs text-charcoal">
              {COMMUNICATION_MODALITIES.map((m) => (
                <label key={m.value} className="flex items-center gap-1.5">
                  <input type="checkbox" name={`skill_${skillId}_fi_communication`} value={m.value} />
                  {m.label}
                </label>
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5 sm:col-span-3">
            <Label htmlFor={`skill_${skillId}_fi_independence`} className="text-xs">
              Level of independence
            </Label>
            <select
              id={`skill_${skillId}_fi_independence`}
              name={`skill_${skillId}_fi_independence`}
              className="h-9 w-full max-w-64 rounded-sm border border-border bg-white px-2 text-sm"
              defaultValue=""
            >
              <option value="">Select</option>
              {INDEPENDENCE_LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`skill_${skillId}_notes`} className="text-xs">
          Notes (optional)
        </Label>
        <Textarea id={`skill_${skillId}_notes`} name={`skill_${skillId}_notes`} rows={2} placeholder="Additional observation" />
      </div>
    </div>
  );
}
