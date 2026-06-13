
-- Extend existing question to explicitly call out operations + front-line
UPDATE public.training_question_templates
SET expected_outcome = 'All relevant staff — including compliance, operations, and front-line/client-facing staff — are included and completed training'
WHERE section_code = 'TIE' AND sort_order = 150;

-- Add 3 new effectiveness checks (slot between existing items, keep section order tidy)
INSERT INTO public.training_question_templates
  (section_code, section_name, control_area, control_objective, test_procedure, expected_outcome, sort_order) VALUES
('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Timeframe Compliance',
 'Confirm staff completed training within required timeframes',
 'Compare completion dates in training log against policy deadlines (e.g. within X days of hire, annual refresher cycle)',
 'All staff completed required training within the timeframes set out in the training policy', 145),

('TIE', 'Training Implementation (Effectiveness Testing)', 'Training Topics Logged',
 'Confirm training logs capture the topics covered in each session',
 'Review training register/log for topic detail per session',
 'Logs identify the topics/subjects covered in each training session, not just attendance', 146),

('TIE', 'Training Implementation (Effectiveness Testing)', 'Adherence to Training Plan',
 'Confirm training sessions were conducted as per the documented training plan',
 'Compare delivered training sessions and content against the approved training plan / curriculum',
 'Evidence shows sessions were delivered in line with the planned schedule, audience, and content', 155);
