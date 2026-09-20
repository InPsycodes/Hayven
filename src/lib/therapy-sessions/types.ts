export type BehaviourMeasurement = "frequency" | "duration" | "intensity" | "percent" | "latency";
export type BehaviourDirection = "increase" | "decrease";
export type PromptLevel = "independent" | "gestural" | "verbal" | "partial_physical" | "full_physical";
export type GoalStatus = "active" | "met" | "paused" | "discontinued";

export interface AssignedChild {
  id: string;
  firstName: string;
  dateOfBirth: string;
}

export interface CareTeamMember {
  therapistId: string;
  name: string;
  therapyType: string | null;
  since: string;
}

export interface RealGoal {
  id: string;
  title: string;
  domain: string | null;
  status: GoalStatus;
}

export interface RealTargetBehaviour {
  id: string;
  label: string;
  parentLabel: string | null;
  measurement: BehaviourMeasurement;
  direction: BehaviourDirection;
}

export type SkillDomainType =
  | "name_response"
  | "functional_communication"
  | "functional_independence"
  | "speech_approximation"
  | "communicative_initiation"
  | "receptive_instructions"
  | "object_identification"
  | "concept_understanding"
  | "tacting_naming"
  | "mand_diversity"
  | "motor_speech_dttc";

export interface RealSkill {
  id: string;
  label: string;
  currentPercent: number | null;
  domainType: SkillDomainType | null;
}

export interface ChildProgramme {
  goals: RealGoal[];
  targetBehaviours: RealTargetBehaviour[];
  skills: RealSkill[];
}
