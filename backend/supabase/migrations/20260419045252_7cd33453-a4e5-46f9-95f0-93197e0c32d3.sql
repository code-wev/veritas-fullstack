
INSERT INTO public.risk_assessment_question_templates
  (section_code, section_name, control_area, control_objective, test_procedure, expected_outcome, sort_order) VALUES
-- Methodology additions (slot between sort_order 60 and 70)
('MTH', 'Methodology', 'Definition of ML/TF Risk', 'Does the RBA define "risk" in ML/TF terms?', 'Review definitions section of the RBA', 'Risk is explicitly defined in ML/TF context', 62),
('MTH', 'Methodology', 'Likelihood Definition', 'Does the RBA define how likelihood is assessed?', 'Review methodology for likelihood scoring', 'Likelihood assessment approach is documented', 64),
('MTH', 'Methodology', 'Impact Definition', 'Does the RBA define how impact is assessed (regulatory, legal, reputational, financial)?', 'Review methodology for impact scoring', 'Impact dimensions are documented and applied', 66),
('MTH', 'Methodology', 'Scoring Model', 'Does the RBA use a scoring model or risk scale (Low, Medium, High or equivalent)?', 'Review scoring scale or matrix', 'A consistent scoring scale is documented and applied', 92),
('MTH', 'Methodology', 'Scoring Reproducibility', 'Is the scoring model documented clearly enough to reproduce outcomes?', 'Attempt to reproduce a sample rating using the documented method', 'A second analyst could reach the same rating from the documented inputs', 94),
('MTH', 'Methodology', 'Weights / Prioritization', 'Are weights or prioritization rules explained if used?', 'Review weighting or aggregation rules', 'Weights and prioritization logic are explained or marked N/A', 96),
('MTH', 'Methodology', 'Documented Rationale for Ratings', 'Are risk ratings supported by documented rationale?', 'Spot-check several ratings for written justification', 'Each rating is accompanied by clear, documented rationale', 112),

-- Risk Tolerance additions (between 130 and 140)
('TOL', 'Risk Tolerance', 'Risk Acceptance Process', 'Does the RBA include a process for risk acceptance when residual risk exceeds tolerance?', 'Review escalation and risk acceptance procedures', 'A documented process exists to escalate, accept, or remediate out-of-tolerance risks', 132),
('TOL', 'Risk Tolerance', 'Likelihood-Impact Matrix', 'Is a likelihood-impact matrix used or an equivalent decision tool?', 'Review whether a matrix or decision tool drives final ratings', 'A matrix or equivalent decision tool is consistently used', 134),

-- Framework additions (mixed in around existing items)
('FRM', 'Framework', 'New Developments & Technology Assessment', 'Does the RBA assess new developments and technologies before implementation?', 'Review pre-implementation risk assessment process for new tech/products', 'New developments and technologies are assessed before launch', 32),
('FRM', 'Framework', 'Affiliate Assessment', 'Are foreign or domestic affiliates assessed where applicable?', 'Review whether affiliates are scoped into the assessment', 'Affiliates are assessed where applicable, or marked N/A with rationale', 34),
('FRM', 'Framework', 'Other Relevant Factors', 'Are other relevant factors assessed (legal, structural, third-party providers)?', 'Review scope for additional risk drivers', 'Other relevant factors are assessed and documented', 36),

-- Geography addition
('GEO', 'Geography', 'Credible Source Identification', 'Are higher-risk geographies identified using credible sources (sanctions, FATF, advisories)?', 'Review references used to classify high-risk geographies', 'Higher-risk geographies are identified via credible, named sources', 245),

-- Indicators additions
('IND', 'Indicators, Typologies & Threats', 'Documented Rationale for High Ratings', 'Does the RBA document why certain elements are rated high or not high?', 'Review high-risk classifications for written rationale', 'Each high-risk classification has documented justification', 355),
('IND', 'Indicators, Typologies & Threats', 'Sector-Relevant ML/TF Threats', 'Does the RBA identify key ML/TF threats relevant to the sector?', 'Review threat list against the entity sector', 'Sector-specific ML/TF threats are explicitly identified', 365);
