-- Phase 1 removes the profile questionnaire and its engine inputs. Existing
-- profiles are scrubbed so rejected questionnaire data is not retained.
update public.athlete_profiles
set profile = profile
  - 'injuryHistory'
  - 'medicalFlags'
  - 'medications'
  - 'pregnancyStatus'
  - 'eatingDisorderRisk'
  - 'priorWeightCutHistory'
  - 'medicalProfessionalInvolved';

alter table public.athlete_profiles
  drop column if exists sensitive_medical;
