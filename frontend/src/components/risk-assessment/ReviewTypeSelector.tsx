import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, FileText, Activity, TestTube } from 'lucide-react';

type ReviewType = 'baseline' | 'intermediate' | 'advanced';

interface ReviewTypeSelectorProps {
  currentType: ReviewType;
  onSelect: (type: ReviewType) => void;
}

const REVIEW_TYPES = [
  {
    id: 'baseline' as ReviewType,
    name: 'RBA Existence and Design Review',
    subtitle: 'Baseline',
    icon: FileText,
    description: 'Standard review for most clients and audits. Confirms the RBA exists, is documented, approved, and covers prescribed elements.',
    sections: ['Document Control', 'Methodology', 'Business Risk Coverage', 'Risk Factor Inventory (Light)', 'Relationship Risk Coverage', 'Findings Summary'],
    evidence: ['RBA document', 'Approval evidence', 'Scoring methodology'],
    alignment: ['PCMLTFR s.156(1)(c)', 'FINTRAC baseline expectations'],
    recommended: true,
  },
  {
    id: 'intermediate' as ReviewType,
    name: 'RBA Operational Alignment Review',
    subtitle: 'Intermediate',
    icon: Activity,
    description: 'Enhanced review for growing MSBs, PSPs, FinTechs, or clients with prior findings. Includes operationalization checks.',
    sections: ['All Baseline sections', 'Full Operationalization (Section 7)', 'Partial Consistency Checks'],
    evidence: ['All Baseline evidence', 'Sample risk outputs', 'High-risk controls', 'Monitoring descriptions'],
    alignment: ['Growing or maturing compliance programs', 'Prior FINTRAC findings'],
    recommended: false,
  },
  {
    id: 'advanced' as ReviewType,
    name: 'RBA Effectiveness and Stress Testing',
    subtitle: 'Advanced',
    icon: TestTube,
    description: 'Comprehensive effectiveness review or FINTRAC remediation response. Full testing against operational reality.',
    sections: ['All Intermediate sections', 'Full Testing Against Reality (Section 8)', 'Control failure tracking', 'STR feedback loops'],
    evidence: ['All Intermediate evidence', 'Transaction testing results', 'Remediation tracking'],
    alignment: ['FINTRAC examination response', 'Major compliance transformation'],
    recommended: false,
  },
];

export function ReviewTypeSelector({ currentType, onSelect }: ReviewTypeSelectorProps) {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-xl font-semibold">Select Review Type</h2>
        <p className="text-muted-foreground mt-1">
          Choose the appropriate scope based on client complexity and audit objectives
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {REVIEW_TYPES.map((type) => (
          <Card
            key={type.id}
            className={`cursor-pointer transition-all hover:border-primary ${
              currentType === type.id ? 'border-primary ring-2 ring-primary/20' : ''
            }`}
            onClick={() => onSelect(type.id)}
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <type.icon className="w-5 h-5 text-primary" />
                  <Badge variant={type.id === 'advanced' ? 'default' : type.id === 'intermediate' ? 'secondary' : 'outline'}>
                    {type.subtitle}
                  </Badge>
                </div>
                {type.recommended && (
                  <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                    Recommended
                  </Badge>
                )}
              </div>
              <CardTitle className="text-lg mt-2">{type.name}</CardTitle>
              <CardDescription>{type.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="text-sm font-medium mb-2">Sections Included:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {type.sections.map((section, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      {section}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Evidence Required:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {type.evidence.map((item, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-blue-500" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div>
                <h4 className="text-sm font-medium mb-2">Alignment:</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  {type.alignment.map((item, idx) => (
                    <li key={idx} className="text-xs">{item}</li>
                  ))}
                </ul>
              </div>

              <Button
                className="w-full mt-4"
                variant={currentType === type.id ? 'default' : 'outline'}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelect(type.id);
                }}
              >
                {currentType === type.id ? 'Selected' : 'Select'} {type.subtitle}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
