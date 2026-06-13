-- Update the section initialization function with actual regulatory content from the sample PDF
CREATE OR REPLACE FUNCTION public.initialize_audit_report_sections(p_report_id uuid)
RETURNS void
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  -- Insert all standard sections with pre-populated regulatory content
  INSERT INTO audit_report_sections (report_id, section_key, section_title, section_order, is_editable, source_module, content)
  VALUES
    -- Cover Page (not editable - generated from settings)
    (p_report_id, 'cover_page', 'Cover Page', 1, false, NULL, NULL),
    
    -- Transmittal Letter
    (p_report_id, 'transmittal_letter', 'Transmittal Letter', 2, true, NULL, 
'[PREPARED_FOR_NAME]
[PREPARED_FOR_TITLE], [PREPARED_FOR_COMPANY]
[PREPARED_FOR_ADDRESS]

[REPORT_DATE]

Dear [PREPARED_FOR_NAME],

**INDEPENDENT REVIEW OF THE ANTI-MONEY LAUNDERING/ANTI-TERRORIST FINANCING COMPLIANCE PROGRAM:**
**FINAL REPORT FOR [CLIENT_NAME]**

C&G Professional Services Inc. is pleased to present [CLIENT_NAME] with the report of the completed independent review of the Company''s Anti-Money Laundering (AML) and Anti-Terrorist Financing (ATF) compliance program, in line with Section 156(3) of the PCMLTFR.

Under Part 7, Section 156(4) of the PCMLTFR, you are expected to report the findings of the review, any updates made to the policies and procedures within the reporting period and the status of the implementation of those updates in writing to a senior officer within 30 days after the day on which the review is completed.

If you have any questions on this report, please contact the Lead AML Reviewer at [CONTACT_INFO].

Thank you for the opportunity to conduct this review.

Sincerely,

Signed and on behalf of: [PREPARED_BY_COMPANY]

[LEAD_REVIEWER_NAME] – [LEAD_REVIEWER_CREDENTIALS]
Lead Reviewer'),
    
    -- Table of Contents
    (p_report_id, 'table_of_contents', 'Table of Contents', 3, false, NULL, NULL),
    
    -- Restrictions and Intended Use
    (p_report_id, 'restrictions', 'Restrictions and Intended Use', 4, true, NULL,
'[PREPARED_BY_COMPANY] has completed an independent effectiveness review of [CLIENT_NAME]''s ("the Company") Anti-Money Laundering ("AML") and Anti-Terrorist Financing (ATF) compliance programs against applicable AML regulatory requirements outlined in the Proceeds of Crime (Money Laundering) and Terrorist Financing Act ("PCMLTFA"), Proceeds of Crime (Money Laundering) and Terrorist Financing Regulations ("PCMLTFR"), and the Financial Transactions and Reports Analysis Centre of Canada ("FINTRAC") Guidelines (collectively referred to as the "AML Regulations").

The PCMLTFA requires all reporting entities to undergo a comprehensive AML review at least biennially¹. The AML review must cover the Company''s policies and procedures, assessment of risks related to the PCMLTFA and the Company''s training program and test its effectiveness. The assessment of risks related to PCMLTFA includes all the components of the risk-based approach, where applicable, as explained in FINTRAC Guidelines, including risk assessment, risk mitigation and ongoing monitoring.

While this report is intended solely for the use of [CLIENT_NAME] to support the Company with its obligation to comply with the effectiveness testing requirement stipulated by the AML Regulations, it may be shared with third parties, including but not limited to regulators, financial institutions, external auditors, and potential acquirers for the purpose of demonstrating compliance, due diligence, or regulatory review. Any sharing beyond these purposes requires [PREPARED_BY_COMPANY]''s prior written consent.

[PREPARED_BY_COMPANY] was not engaged to perform an audit, review, or compilation of [CLIENT_NAME]''s financial statements or financial information and, accordingly, it expresses no opinion or other form of assurance on the financial statements or financial information.

In completing this review, [PREPARED_BY_COMPANY] assumes no responsibility to any user of the report other than [CLIENT_NAME]. Any other person or entity who chooses to rely on this report do so entirely at their own risk.

¹ PCMLTFR Section 156(1)(f) and 156(3): Every reporting entity is required to establish, document, and conduct a review of their AML/ATF compliance program every two years, either by an internal or external auditor, or by the entity itself if no auditor is available.'),
    
    -- Scope and Approach
    (p_report_id, 'scope', 'Scope and Approach', 5, true, NULL,
'**Scope**

As per the signed engagement letter dated [ENGAGEMENT_DATE], [CLIENT_NAME] engaged [PREPARED_BY_COMPANY] to conduct an independent review of its AML/ATF compliance program. The review focuses on the evaluation and implementation of its policies and procedures, risk-based assessment framework, and training program to ensure alignment with Canadian AML regulations applicable to Money Service Businesses (MSBs). These regulations are outlined in the following Acts and guidelines (collectively referred to as the "AML Regulations"):

1. Proceeds of Crime (Money Laundering) and Terrorist Financing Act ("PCMLTFA"),
2. Proceeds of Crime (Money Laundering) and Terrorist Financing Regulations ("PCMLTFR"),
3. Financial Transactions and Reports Analysis Centre of Canada ("FINTRAC") Guidelines,
4. The United Nations Act,
5. The Special Economic Measures Act, and
6. The Justice for Victims of Corrupt Foreign Officials Act.

In establishing and implementing a comprehensive and effective AML/ATF compliance program, the Company is expected to consider the following five pillars:

1. The appointment of a compliance officer;
2. The development and application of written compliance policies and procedures that are kept up-to-date;
3. A risk assessment of the Company''s business activities and client relationships;
4. The development and maintenance of a written ongoing compliance training program and plan; and
5. The institution and documentation of an effectiveness review of the Company''s compliance program every two years (at a minimum).

**Approach**

In conducting the independent review of the Company''s AML/ATF compliance program, we adopted the following approach:

1. **Planning and Review** - Agree the scope, objectives and timelines of the engagement
2. **Testing of Transactional Data, Client Records and Controls** - Perform walkthroughs of relevant processes and conduct sample-based testing on reportable transactions
3. **Business Report Card** - Document findings and observations
4. **Reporting** - The issuance of a draft report to the Client setting out the procedures performed and the findings of our work

**Sampling Methodology**

[PREPARED_BY_COMPANY] has considered the following factors in selecting the samples tested – The population size, risk, complexity, and criticality of the processes being tested. The sampling methodology was also based on professional judgment.

Professional judgment includes the risk identified through the review of previous examination reports, AML independent reports, other facts gathered during the planning and review phase or industry gaps and deficiencies. Accordingly, we may not have observed all the compliance deviations that occurred during the period of review.'),
    
    -- Categorization of Findings
    (p_report_id, 'categorization', 'Categorization of Our Findings', 6, true, NULL,
'We have categorized our findings to assist [CLIENT_NAME] with its implementation priorities. Our findings have been categorized to align with FINTRAC''s penalties for non-compliance (i.e., the "harm done assessment").

Findings are deficiencies that have been categorized as either:

**1. Complete non-compliance** occurs when a requirement has not been met because the reporting entity has not put in place measures to meet the requirement to any degree, or what is in place is too rudimentary. E.g. not appointing a compliance officer, not documenting the AML policies and procedures, or not submitting a reportable transaction to FINTRAC.
- This level of non-compliance is viewed as the most severe and typically results in the highest penalties, reflecting the significant risk it poses to the integrity of the financial system in preventing money laundering and terrorist financing.

**2. Partial non-compliance** occurs when parts or elements of a requirement have not been met. E.g., the reporting entity has documented a policy that requires that suspicious transactions must be reported to FINTRAC as soon as practicable but has not included the procedures it would follow to fulfil that policy.
- Penalties for partial non-compliance can vary, ranging from formal warnings to fines, depending on the regulatory framework, the specific requirements that were not fully met, and the entity''s history of compliance.

The partial non-compliance is further sub-categorized into the following:

- **Partial non-compliance with important weaknesses**: An element that is priority for achieving the objectives of the Act or FINTRAC''s mandate is not met or missed;
- **Partial non-compliance with moderate weaknesses**: An element that forms the basis for achieving the objectives of the Act or FINTRAC''s mandate is not met or missed;
- **Partial non-compliance with lesser weaknesses**: An element that enables the efficient achievement of the objectives of the Act or FINTRAC''s mandate is not met or missed.

Where a finding involves two or more types of weaknesses, the higher non-compliance weakness will apply.

**Observations**

Observations on the other hand are not deficiencies against the AML Regulations, but rather processes observed or reviewed, which can sometimes be improved upon based on industry best practices or the reviewer''s industry experience.'),
    
    -- About the Reporting Entity
    (p_report_id, 'about_entity', 'About the Reporting Entity', 7, true, NULL,
'[CLIENT_NAME] was incorporated on [INCORPORATION_DATE] under the laws of [JURISDICTION], Canada (Incorporation Number: [INCORPORATION_NUMBER]). The Company is also registered with FINTRAC under MSB registration number [MSB_NUMBER]. Its initial MSB registration was dated [MSB_REGISTRATION_DATE], and the current expiry date is [MSB_EXPIRY_DATE].

The company has its registered office at [CLIENT_ADDRESS] with its official website at: [CLIENT_WEBSITE].

Under its FINTRAC registration, [CLIENT_NAME] is authorized to provide services related to [AUTHORIZED_SERVICES]. [DESCRIBE_BUSINESS_MODEL]

**Governance Structure**

[DESCRIBE_GOVERNANCE_STRUCTURE]

**Compliance Regime**

[CLIENT_NAME] maintains a compliance program, including having a compliance officer, written compliance policies and procedures, risk assessment, ongoing compliance training program and plan, and a review of its compliance program.

**Coverage Period**

Our review of the Company''s operations covered the period from [PERIOD_START] to [PERIOD_END], covering updates to policies, procedures, risk assessments, and training policies and plans during this period. The review was performed in line with Canadian regulatory standards current as of [PERIOD_END] ensuring that all relevant updates and compliance standards were thoroughly assessed.'),
    
    -- Summary of Findings
    (p_report_id, 'summary_findings', 'Summary of Findings', 8, true, NULL, NULL),
    
    -- Detailed Findings - MSB Registration
    (p_report_id, 'detailed_msb_registration', 'FINTRAC and Revenue Quebec MSB Registration', 10, true, 'msb_registration',
'**Regulatory Requirement**

It is a requirement that every MSB operating in Canada must register and update their information with FINTRAC. Whenever there is a change, such a change must be communicated to FINTRAC within 30 days.

**Regulatory Objective**

This information helps FINTRAC ensure effective compliance in the sector, using a risk-based approach.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Compliance Officer
    (p_report_id, 'detailed_compliance_officer', 'Appointment of a Compliance Officer', 11, true, 'governance',
'**Regulatory Requirement**

Per the AML Regulations, an effective compliance program begins with the appointment of a compliance officer. This compliance officer must have an adequate knowledge of the AML Regulations, possess the authority, and have access to adequate resources to implement the compliance program.

- Part 7, Section 156(1)(a) of the PCMLTFR.
- FINTRAC''s Guidance on Compliance program requirements (Who can be a compliance officer)

**Regulatory Objective**

The appointment of a knowledgeable and empowered compliance officer ensures that the reporting entity has dedicated oversight for AML/ATF compliance, enabling effective implementation and monitoring of the compliance program.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Policies
    (p_report_id, 'detailed_policies', 'Documentation of the Compliance Policies and Procedures', 12, true, 'aml_program',
'**Regulatory Requirement**

Reporting entities are responsible for the development, documentation and application of approved and up-to-date compliance policies and procedures. This ensures that a comprehensive framework and robust controls are in place to comply with the AML Regulations.

- Part 7, Section 156(1)(b) of the PCMLTFR.
- FINTRAC''s Guidance on Compliance program requirements (Compliance policies and procedures requirements)

**Regulatory Objective**

Policies and procedures are critical because they set out important principles and standards that staff and delegated persons must meet in a consistent manner. They provide the operational framework for detecting, preventing, and reporting money laundering and terrorist financing activities.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Risk Assessment
    (p_report_id, 'detailed_risk_assessment', 'Documentation of the AML/ATF Compliance Risk Assessment', 13, true, 'risk_assessment',
'**Regulatory Requirement**

Per the AML Regulations, each reporting entity is expected to develop a risk-based assessment document which will help the Company in identifying and assessing its money laundering and terrorist financing risks, and proffer mitigation measures to deal with the identified risks. This risk-based assessment documentation must be reviewed periodically and approved by the Company''s Senior Management or Board of Directors.

- Part 7, Section 156(1)(c) of the PCMLTFR.
- FINTRAC''s Guidance on Compliance program requirements (Risk assessment requirements and Enhanced measures)

**Regulatory Objective**

Assessing and documenting the ML/TF risks ensures that reporting entities are aware of their potential exposure and vulnerability to ML/TF and can apply appropriate mitigation measures to reduce those risks - Thus, effectively contributing to the objectives of the PCMLTFA and FINTRAC''s ability to carry out its mandate.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Training
    (p_report_id, 'detailed_training', 'Documentation and Effectiveness of the Ongoing Training Program', 14, true, 'training',
'**Regulatory Requirement**

Per the AML Regulations, every reporting entity is required to develop, implement and document an ongoing compliance training program for employees. The training program must include information on:
- The requirements of the PCMLTFA and its regulations;
- The reporting entity''s policies and procedures;
- The identification and reporting of suspicious transactions; and
- Background information on money laundering and terrorist financing.

- Part 7, Section 156(1)(d) of the PCMLTFR.
- FINTRAC''s Guidance on Compliance program requirements (Ongoing compliance training program)

**Regulatory Objective**

Training ensures that all relevant staff understand their AML/ATF obligations and can effectively implement the compliance program. Well-trained employees are the first line of defense against money laundering and terrorist financing activities.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Review Timeframe
    (p_report_id, 'detailed_review_timeframe', 'Adherence to the Prescribed Review Timeframe', 15, true, 'governance',
'**Regulatory Requirement**

Per Section 156(3) of the PCMLTFR, reporting entities must conduct an independent review of their AML/ATF compliance program at least once every two years. This review must assess the effectiveness of the policies and procedures, risk assessment, and training program.

- Part 7, Section 156(1)(f) and 156(3) of the PCMLTFR.
- FINTRAC''s Guidance on Compliance program requirements (Two-year effectiveness review)

**Regulatory Objective**

Regular effectiveness reviews ensure that the compliance program remains current, relevant, and effective in addressing ML/TF risks. It provides assurance that the reporting entity''s controls are operating as intended and identifies areas for improvement.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - KYC
    (p_report_id, 'detailed_kyc', 'Client Identification and Record-keeping Obligations', 16, true, 'kyc',
'**Regulatory Requirement**

Reporting entities must verify the identity of clients and maintain accurate records. Key requirements include:
- Verifying client identity using reliable, independent source documents
- Maintaining records for at least five years
- Recording beneficial ownership information for entities
- Determining if a third party is involved in transactions
- Conducting ongoing monitoring of business relationships

- Part 3, Sections 54-68 of the PCMLTFR (Client identification)
- Part 6, Section 143 of the PCMLTFR (Record keeping)
- FINTRAC''s Guidance on Methods to verify the identity of persons and entities

**Regulatory Objective**

Client identification and record-keeping are fundamental to the AML/ATF regime. Accurate identification prevents criminals from using anonymous accounts for illicit purposes, while proper record-keeping ensures an audit trail for investigations and compliance verification.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Reporting
    (p_report_id, 'detailed_reporting', 'Reporting Obligations – LVCTR, EFTs, STRs and TPRs', 17, true, 'reporting',
'**Regulatory Requirement**

Reporting entities have specific obligations to submit various reports to FINTRAC:

**Large Virtual Currency Transaction Reports (LVCTRs):**
The completion and submission within 15 calendar days of receiving virtual currency of $10,000 or more in a single transaction or multiple transactions within a 24-hour static period.

**Electronic Funds Transfer Reports (EFTRs):**
The completion and submission within five business days of a single international remittance transaction of $10,000 or more, or multiple transactions within 24 hours totaling $10,000 or more.

**Suspicious Transaction Reports (STRs):**
A suspicious transaction (completed or attempted) must be submitted to FINTRAC as soon as practicable after the reporting entity has reasonable grounds to suspect ML/TF.

**Terrorist Property Reports (TPRs):**
When property is owned or controlled by or on behalf of a terrorist or terrorist group and is in the possession of the reporting entity, a TPR must be submitted without delay.

- Part 5, Section 131-133 of the PCMLTFR
- FINTRAC''s Guidance on Reporting transactions to FINTRAC

**Regulatory Objective**

Transaction reporting is the cornerstone of Canada''s AML/ATF regime. These reports provide FINTRAC with the financial intelligence needed to detect and deter money laundering and terrorist financing activities. Timely and accurate reporting enables effective analysis and dissemination of intelligence to law enforcement.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Detailed Findings - Monitoring
    (p_report_id, 'detailed_monitoring', 'Ongoing Monitoring Obligations', 18, true, 'monitoring',
'**Regulatory Requirement**

Per the AML Regulations, the purpose of ongoing monitoring of business relationships is to:
1. Detect suspicious transactions that are required to be reported to FINTRAC;
2. Keep client identification, beneficial ownership information, and the purpose and intended nature of the business relationship record up to date;
3. Re-assess client risk based on their transactions and activities; and
4. Determine whether the transactions or activities are consistent with your information and risk assessment of the client.

- Part 3, Section 123.1 of the PCMLTFR
- FINTRAC''s Guidance on Ongoing monitoring requirements

**Regulatory Objective**

Ongoing monitoring ensures that reporting entities maintain current knowledge of their clients and can identify unusual or suspicious patterns of activity. Effective monitoring is essential for timely detection and reporting of potential ML/TF activities.

The key areas of ongoing monitoring include:
1. Effectiveness of the sanction, PEPs & HIO screening process and application;
2. Review of high-risk clients and the special measures applied;
3. Effectiveness and timeliness of transaction monitoring alert rules; and
4. Reviews of previous AML Reviews and/or FINTRAC Examinations.

**Findings, Observations and Recommendation**

[AUTO_POPULATE_FROM_FINDINGS]'),
    
    -- Appendix A: Source Documentation
    (p_report_id, 'appendix_source_docs', 'Appendix A: Source Documentation', 20, false, NULL, NULL),
    
    -- Appendix B: Action Plan
    (p_report_id, 'appendix_action_plan', 'Appendix B: Action Plan', 21, false, NULL, NULL),
    
    -- Appendix C: Records of Deficiencies
    (p_report_id, 'appendix_deficiencies', 'Appendix C: Records of Deficiencies', 22, false, NULL, NULL),
    
    -- Appendix D: Lead Reviewer
    (p_report_id, 'appendix_reviewer', 'Appendix D: Lead Reviewer', 23, true, NULL,
'**[LEAD_REVIEWER_NAME]**
[LEAD_REVIEWER_CREDENTIALS]

[REVIEWER_BIO]')
    
  ON CONFLICT (report_id, section_key) DO NOTHING;
END;
$$;