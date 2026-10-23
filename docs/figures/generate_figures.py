"""Render report SVGs from saved evidence only. No model/API imports or execution."""
from pathlib import Path
import html
import json
import textwrap

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
read = lambda p: json.loads((ROOT / p).read_text(encoding="utf-8-sig"))
VAL = read("backend/ml/results/validation_metrics.json")
TEST = read("backend/ml/results/test_metrics.json")
CONFIG = read("backend/ml/results/configuration.json")
CASE = read("cases/HHG-001.json")
SCHEMA = read("backend/tests/fixtures/closedcase_schema.json")
BLUE, TEAL, INK, MUTED = "#24558a", "#16716b", "#172c43", "#52657a"


class Figure:
    def __init__(self, name, title, subtitle, height=1000):
        self.name, self.height, self.parts = name, height, []
        self.parts.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="1440" height="{height}" viewBox="0 0 1440 {height}" role="img" aria-labelledby="title desc">')
        self.parts.append(f'<title id="title">{html.escape(title)}</title><desc id="desc">{html.escape(subtitle)}</desc>')
        self.parts.append('<defs><marker id="arrow" markerWidth="9" markerHeight="9" refX="8" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#52657a"/></marker></defs>')
        self.parts.append(f'<rect width="1440" height="{height}" fill="white"/>')
        self.text(55, 57, title, 33, weight="700")
        self.text(55, 94, subtitle, 20, color=MUTED)
        self.line([(55, 117), (1385, 117)], arrow=False)

    def text(self, x, y, value, size=22, color=INK, anchor="start", weight="400"):
        self.parts.append(f'<text x="{x}" y="{y}" font-family="Arial, Helvetica, sans-serif" font-size="{size}" font-weight="{weight}" text-anchor="{anchor}" fill="{color}">{html.escape(str(value))}</text>')

    def lines(self, x, y, values, size=21, **kwargs):
        for i, value in enumerate(values):
            self.text(x, y + i * (size + 8), value, size, **kwargs)

    def box(self, x, y, w, h, label, fill="#f0f5fb", stroke=BLUE, size=22):
        self.parts.append(f'<rect x="{x}" y="{y}" width="{w}" height="{h}" rx="10" fill="{fill}" stroke="{stroke}" stroke-width="1.8"/>')
        lines = label if isinstance(label, list) else textwrap.wrap(label, max(12, int(w / (size * .55)) - 3))
        top = y + h / 2 - (len(lines) - 1) * (size + 7) / 2 + size * .34
        for i, item in enumerate(lines):
            self.text(x + w / 2, top + i * (size + 7), item, size, anchor="middle")

    def line(self, points, dashed=False, arrow=True, color=MUTED):
        pts = " ".join(f"{x},{y}" for x, y in points)
        self.parts.append(f'<polyline points="{pts}" fill="none" stroke="{color}" stroke-width="2.2" stroke-linejoin="round" {"stroke-dasharray=" + chr(34) + "7 6" + chr(34) if dashed else ""} {"marker-end=" + chr(34) + "url(#arrow)" + chr(34) if arrow else ""}/>')

    def section(self, x, y, label):
        self.text(x, y, label, 22, color=BLUE, weight="700")

    def save(self, notes, source):
        y = self.height - 100
        self.line([(55, y - 20), (1385, y - 20)], arrow=False)
        self.lines(55, y + 4, notes, 19, color=MUTED)
        self.text(55, self.height - 22, "Source: " + source, 16, color=MUTED)
        self.parts.append('</svg>')
        (HERE / (self.name + ".svg")).write_text("\n".join(self.parts), encoding="utf-8")


def architecture():
    f = Figure("system-architecture", "System architecture", "Offline development, runtime investigation and isolated shadow inference", 1160)
    f.section(55, 156, "A  OFFLINE ML DEVELOPMENT")
    nodes = [(55,195,245,95,["Transaction / Identity /", "Historical CSVs"]),
             (340,195,235,95,["Labels + temporal split", "Train / Sep / Oct"]),
             (615,195,235,95,["Train-only", "preprocessing + fitting"]),
             (890,195,495,95,["Model comparison: September validation", "Freeze model and threshold"])]
    for n in nodes: f.box(*n)
    for a,b in [(300,340),(575,615),(850,890)]: f.line([(a,242),(b,242)])
    f.box(890,330,495,80,["Frozen October evaluation", "One final selected-model test"])
    f.line([(1137,290),(1137,330)])
    f.box(340,330,510,80,["XGBoost artifact + fitted preprocessor", "Authorized frozen reconstruction/export"])
    f.line([(890,270),(870,270),(870,317),(595,317),(595,330)],dashed=True)
    f.text(55, 435, "Artifact export does not re-evaluate October.",18,color=MUTED)
    f.section(55,460,"B  RUNTIME INVESTIGATION")
    for x,w,label in [(55,265,["Next.js", "Investigation Studio"]),(375,240,["Next.js API proxy"]),(670,230,["FastAPI", "POST /investigate"]),(955,430,["LangGraph workflow", "Gather transaction / graph / history"])]:
        f.box(x,490,w,85,label)
    for a,b in [(320,375),(615,670),(900,955)]: f.line([(a,532),(b,532)])
    f.box(955,625,200,80,["TigerGraph", "4 installed queries"],size=20)
    f.box(1185,625,200,80,["Historical case", "CSV retrieval"],size=20)
    f.line([(1055,625),(1055,575)])
    f.line([(1285,625),(1285,575)])
    f.box(955,755,430,80,["Deterministic assessment", "Existing policy → final recommendation"])
    f.line([(1385,532),(1408,532),(1408,795),(1385,795)])
    f.box(955,880,430,80,["Persistence", "Local JSON + TigerGraph ClosedCase"])
    f.line([(1170,835),(1170,880)])
    f.section(55,630,"C  ISOLATED SHADOW INFERENCE")
    f.box(55,670,385,100,["Separate .venv-ml worker", "Frozen XGBoost + preprocessor"],fill="#eef8f6",stroke=TEAL)
    f.line([(650,410),(650,600),(460,600),(460,650),(245,650),(245,670)],dashed=True)
    f.line([(955,555),(910,555),(910,650),(450,650),(450,715),(440,715)],dashed=True)
    f.text(505,638,"Transaction snapshot",18,color=TEAL)
    f.box(55,850,800,110,["ML prediction state / UI / local audit", "Separate score; never an assessment or policy input"],fill="#eef8f6",stroke=TEAL)
    f.line([(245,770),(245,850)],dashed=True)
    f.line([(55,905),(30,905),(30,532),(55,532)],dashed=True)
    f.text(485,995,"Dashed paths: artifact/shadow data, not policy control",18,color=TEAL)
    f.save(["Graph/history support the existing assessment. Shadow ML output is displayed and audited separately.","No ML → policy control path; no live MCP transport or vector retrieval is represented."],"backend/agent/workflow.py; tools/ml.py; ml/train.py; ml/export.py; frontend API proxy")


def pipeline():
    f=Figure("ml-pipeline","Leakage-safe ML pipeline","Fixed temporal protocol; no new training or evaluation was run to create this figure",1050)
    steps=[("Raw transactions + history","Identity snapshot joined by transaction ID"),
           ("Historical label extraction","confirmed_fraud = 1; cleared = 0; others excluded"),
           ("Temporal split + safeguards","Jul–Aug train; Sep validation; Oct test"),
           ("Train-only preprocessing","25 inputs → 245 transformed features"),
           ("Model training","Same training partition; fixed configurations"),
           ("September validation","Per-model threshold selection by balanced accuracy"),
           ("Model selection and freeze","Balanced accuracy; AP tie-breaker → XGBoost"),
           ("Frozen October test","Evaluate winner once; no tuning or refitting"),
           ("Versioned artifact export","Later authorized reconstruction; no October re-evaluation")]
    for i,(title,detail) in enumerate(steps):
        y=145+i*87
        f.box(290,y,1090,65,[title,detail],size=20)
        f.text(230,y+39,f"{i+1:02}",23,anchor="middle",color=BLUE,weight="700")
        if i<8:f.line([(835,y+65),(835,y+87)])
    f.save(["Training/validation/test rows remain fixed: 6,371 / 2,836 / 3,207.","Export checks frozen training/validation hashes and reproduces saved September scores."],"ml/dataset.py; splits.py; preprocessing.py; training.py; evaluation.py; train.py; export.py")


def workflow():
    f=Figure("agent-workflow","Bounded agent investigation workflow","Deterministic tool orchestration; maximum two assessment iterations",1100)
    for y,label in [(150,"Load case"),(245,"Validate transaction"),(340,"Gather transaction / graph / historical evidence"),(435,"Call shadow ML; store separate ml_prediction"),(530,"Assess — iteration 1"),(625,"Initial policy")]:
        f.box(65,y,710,64,label,size=21)
        if y<625:f.line([(420,y+64),(420,y+95)])
    f.box(890,435,470,90,["Shadow state / UI / local audit", "Score excluded from policy inputs"],fill="#eef8f6",stroke=TEAL)
    f.line([(775,467),(890,467)],dashed=True)
    f.box(65,730,710,80,["Evidence sufficient?", "Or iteration limit reached / no applicable request?"],size=20)
    f.line([(420,689),(420,730)])
    f.box(65,855,300,80,"Final policy")
    f.line([(210,810),(210,855)])
    f.text(235,840,"Yes / stop",18)
    f.box(455,855,320,80,["Persistence", "Local JSON + ClosedCase"])
    f.line([(365,895),(455,895)])
    f.box(900,585,460,76,["Evidence request", "If insufficient + verification applicable"],size=20)
    f.line([(775,770),(850,770),(850,623),(900,623)])
    f.text(800,735,"No",18)
    f.box(900,715,460,76,["SIMULATED_UNAVAILABLE", "simulated=true; response=UNKNOWN"],size=20)
    f.line([(1130,661),(1130,715)])
    f.box(900,855,460,80,["Reassessment — iteration 2", "Limit reached → final policy"],size=20)
    f.line([(1130,791),(1130,855)])
    f.line([(1130,935),(1130,970),(210,970),(210,935)])
    f.save(["No actual customer response is generated. Initial/final recommendations and stopping reason are preserved.","The shadow call is a workflow step; its score is not passed into assessment or policy."],"backend/agent/workflow.py: investigate, evidence_route, simulate_response, build_workflow")


def graph():
    expected={('INVOLVES','Transaction'),('ON_CARD','Card'),('CONNECTED_TO','Card')}
    assert expected.issubset({(r['Name'],r['ToVertexTypeName']) for r in SCHEMA['EdgeTypes']})
    f=Figure("tigergraph-architecture","TigerGraph: verified concepts and relationships","HHGOA_Fraud • SDK runInstalledQuery • schematic, not a full schema export",1030)
    f.section(55,165,"NAMED RELATIONSHIPS VERIFIED IN CAPTURED SCHEMA")
    f.box(70,270,285,115,"ClosedCase")
    f.box(1020,205,330,90,"Transaction")
    f.box(1020,385,330,90,"Card")
    f.line([(355,295),(620,295),(620,250),(1020,250)],arrow=False)
    f.text(650,235,"INVOLVES",22,color=BLUE)
    f.line([(355,330),(680,330),(680,411),(1020,411)],arrow=False)
    f.text(720,395,"ON_CARD",22,color=BLUE)
    f.line([(355,355),(620,355),(620,451),(1020,451)],arrow=False)
    f.text(670,482,"CONNECTED_TO (schema only)",19,color=MUTED)
    f.text(70,437,"Undirected edges; no arrowheads.",19,color=MUTED)
    f.text(70,470,"Persistence uses verified INVOLVES / ON_CARD targets.",19,color=MUTED)
    f.section(55,545,"OTHER OBSERVED CONCEPTS — EDGE TYPES NOT ASSERTED")
    for x,label in [(65,"Customer"),(405,"DeviceProfile"),(745,"EmailDomain"),(1085,"BillingRegion")]:
        f.box(x,575,290,75,label,fill="#f7f9fb",stroke="#8798a9")
    f.section(55,710,"FOUR EXISTING INSTALLED QUERIES")
    for x,y,label in [(65,740,"investigate_transaction"),(750,740,"risk_pattern_summary"),(65,830,"detect_fraud_patterns"),(750,830,"transaction_velocity")]:
        f.box(x,y,625,65,label,size=23)
    f.save(["No Customer/Card/Device/Email/Region edges have been invented from output names.","MCP is an integration boundary only; the implemented transport is pyTigerGraph."],"tests/fixtures/closedcase_schema.json; tools/graph.py; graph_persistence.py; docs/tigergraph-integration.md")


MODELS=[('majority','Majority'),('logistic_unweighted','Logistic'),('logistic_balanced','Balanced Logistic'),('forest_unweighted','Random Forest'),('forest_balanced','Balanced Random Forest'),('xgboost','XGBoost')]


def comparison():
    f=Figure("ml-model-comparison","September model comparison","Primary model-selection metric: balanced accuracy; Average Precision (AP) is the tie-breaker",1070)
    x0,w=420,880
    for tick in range(6):
        x=x0+w*tick/5
        f.line([(x,165),(x,550)],arrow=False,color="#dee5ec")
        f.text(x,585,f"{tick/5:.1f}",18,anchor="middle",color=MUTED)
    for i,(key,name) in enumerate(MODELS):
        y=185+i*60; score=VAL[key]['balanced_accuracy']
        f.text(390,y+24,name,21,anchor="end")
        f.parts.append(f'<rect x="{x0}" y="{y}" width="{w*score}" height="34" rx="3" fill="{TEAL if key=="xgboost" else BLUE}"/>')
        f.text(x0+w*score+14,y+25,f"{score:.4f}",21,weight="700")
    cols=[(55,'Model'),(545,'Precision'),(710,'Recall'),(860,'F1'),(1040,'ROC-AUC'),(1230,'AP')]
    for x,label in cols:f.text(x,650,label,20,weight="700")
    for i,(key,name) in enumerate(MODELS):
        y=697+i*39
        f.text(55,y,name,20)
        for x,k in [(545,'precision'),(710,'recall'),(860,'f1'),(1040,'roc_auc'),(1230,'average_precision')]:f.text(x,y,f"{VAL[key][k]:.4f}",20)
    f.save(["Validation results on the fraud-heavy historical investigation sample; threshold",
            "and model selection were performed on the same September validation partition."],"backend/ml/results/validation_metrics.json; selection.json • n=2,836; fraud prevalence=96.26%")


def confusion():
    f=Figure("october-confusion-matrix","October XGBoost confusion matrix","Final frozen test evaluation • 3,207 transactions • fraud is the positive class",1000)
    assert TEST['confusion_matrix']==[[120,22],[431,2634]]
    f.text(675,180,"PREDICTED CLASS",24,anchor="middle",weight="700")
    f.text(495,235,"Cleared",24,anchor="middle")
    f.text(855,235,"Fraud",24,anchor="middle")
    f.text(200,380,"Actual Cleared",23,anchor="middle")
    f.text(200,610,"Actual Fraud",23,anchor="middle")
    for x,y,label,value,fill,color in [(320,265,'TN',120,'#d9e9f5',INK),(680,265,'FP',22,'#fff1df',INK),(320,495,'FN',431,'#f5dcca',INK),(680,495,'TP',2634,BLUE,'white')]:
        f.parts.append(f'<rect x="{x}" y="{y}" width="360" height="230" fill="{fill}" stroke="white" stroke-width="4"/>')
        f.text(x+180,y+84,label,24,color,anchor="middle")
        f.text(x+180,y+155,f"{value:,}",48,color,anchor="middle",weight="700")
    f.lines(1080,325,["TN: correctly cleared","FP: cleared, flagged","FN: fraud, missed","TP: fraud, detected"],19)
    f.text(320,792,f"Frozen threshold: {TEST['threshold']}",24,weight="700")
    f.text(320,838,"Actual classes: 142 cleared / 3,065 fraud (95.57%)",21)
    f.save(["The threshold was selected on September and frozen before October evaluation.","Results describe the selected historical investigation sample, not population-wide performance."],"backend/ml/results/test_metrics.json; selection.json")


def temporal():
    f=Figure("temporal-split","Temporal split and label maturity","Half-open transaction windows: start included, end excluded",900)
    f.line([(80,260),(1360,260)],arrow=False)
    for x,label in [(80,'1 Jul'),(720,'1 Sep'),(1040,'1 Oct'),(1360,'1 Nov')]:
        f.line([(x,248),(x,272)],arrow=False)
        f.text(x,227,label+" 2016",20,anchor='middle')
    for x,w,name,count,dates in [(80,620,'TRAIN',6371,'1 Jul – 1 Sep 2016'),(720,300,'VALIDATION',2836,'1 Sep – 1 Oct 2016'),(1040,320,'TEST',3207,'1 Oct – 1 Nov 2016')]:
        f.box(x,290,w,155,[name,dates,f"{count:,} rows"],size=22)
    f.lines(100,495,["Labels known before","1 Sep 2016"],22)
    f.lines(740,495,["Labels known before","1 Oct 2016"],22)
    f.lines(1060,495,["Labels known before","7 Nov 2016"],22)
    f.box(80,595,590,85,["1,462 case-boundary exclusions", "Entire cases purged across windows"],fill='#faf5ee',stroke='#a36c32')
    f.box(720,595,640,85,["1,079 label-maturity exclusions", "Outcomes unavailable at the relevant cutoff"],fill='#faf5ee',stroke='#a36c32')
    f.text(80,747,"October untouched for model/threshold selection; scored only in the final frozen evaluation.",22,weight='700')
    f.save(["14,955 labeled = 6,371 train + 2,836 validation + 3,207 test + 2,541 excluded.","Unlabeled transactions are excluded separately; no random train/test split."],"backend/ml/config.py; splits.py; results/configuration.json (split_audit)")


def features():
    f=Figure("feature-engineering","Core feature engineering","core-v1 • Fixed feature allowlist • Training-fitted transformations only",940)
    f.box(65,170,440,130,["19 core variables","5 numeric / time + 14 categorical"],size=23)
    f.text(560,245,"+",46,anchor='middle')
    f.box(615,170,330,130,["6 missingness", "indicators"],size=25)
    f.text(1000,245,"=",46,anchor='middle')
    f.box(1060,170,315,130,["25 raw inputs"],size=29)
    f.box(65,385,780,225,["Preprocessing fitted on training data", "Numeric: median imputation + scaling", "Categorical: bounded rare-category encoding", "Unknown-safe handling; missingness retained"],size=23)
    f.line([(1217,300),(1217,340),(455,340),(455,385)])
    f.box(1000,415,375,150,["245 transformed", "features", "Float CSR matrices"],fill='#eef8f6',stroke=TEAL,size=25)
    f.line([(845,495),(1000,495)])
    f.lines(65,675,["Train: 6,371 × 245     Validation: 2,836 × 245     Test: 3,207 × 245",
                   "Validation and test use transform only; they never fit preprocessing.",
                   "Excluded: risk_score, outcomes, closure metadata, raw IDs and graph-derived ML features."],22)
    f.save(["DeviceType / DeviceInfo are included; anonymous id_* fields are excluded without documented availability.","245 denotes encoded outputs, not independent raw measurements. Snapshot availability remains an assumption."],"backend/ml/features.py; preprocessing.py; results/configuration.json")


def shadow():
    ml=CASE['ml_prediction'];risk=float(CASE['transaction']['risk_score'])
    assert ml['available'] and CASE['final_actions'][0]['action']=='CREATE_CASE'
    f=Figure("shadow-mode","Shadow mode: separate signals, unchanged policy","Recorded HHG-001 / transaction 3514030 • not a calibrated probability",960)
    f.box(70,175,550,130,["Existing dataset risk_score",f"{risk:.2f}"],size=28)
    f.box(810,175,565,170,["XGBoost fraud_score",f"{ml['fraud_score']:.10f}",f"threshold = {ml['threshold']:.10f}",f"prediction = {ml['prediction']}"],fill='#eef8f6',stroke=TEAL,size=24)
    f.box(70,410,550,115,["Existing deterministic assessment", "and policy inputs"],size=25)
    f.line([(345,305),(345,410)])
    f.box(70,650,550,115,["Final action", "CREATE_CASE"],size=30)
    f.line([(345,525),(345,650)])
    f.box(810,485,565,170,["Investigation display", "Separate existing and ML score fields", "ML prediction state / local audit", "No policy control"],fill='#eef8f6',stroke=TEAL,size=24)
    f.line([(1092,345),(1092,485)],dashed=True)
    f.line([(620,240),(725,240),(725,570),(810,570)],dashed=True)
    f.line([(620,707),(725,707),(725,625),(810,625)],dashed=True)
    f.text(810,740,"Dashed arrows: display / audit data",20,color=TEAL)
    f.text(810,785,"Model: "+ml['model_version'],20)
    f.save(["ML prediction is an additional investigation signal and does not independently determine the final policy action.","No ML → policy arrow. A classifier prediction is not an adjudication or an executed banking action."],"cases/HHG-001.json; backend/tools/ml.py; agent/workflow.py; tests/test_shadow_integration.py")


def results():
    f=Figure("results-summary","Results summary: selected historical investigation sample","XGBoost • No claim of population-wide fraud detection performance",990)
    f.box(65,160,620,135,["September validation",f"Balanced accuracy = {VAL['xgboost']['balanced_accuracy']:.4f}","Model and threshold selection partition"],size=23)
    f.box(750,160,625,135,["October frozen test",f"Balanced accuracy = {TEST['balanced_accuracy']:.4f}","Selected model evaluated once"],fill='#eef8f6',stroke=TEAL,size=23)
    for i,(label,key) in enumerate([('Precision','precision'),('Recall','recall'),('F1','f1'),('ROC-AUC','roc_auc'),('Average Precision (AP)','average_precision'),('Alert rate','alert_rate')]):
        col,row=i%3,i//3
        f.box(65+col*455,365+row*185,400,135,["October "+label,f"{TEST[key]:.4f}"],size=25)
    f.lines(65,780,["Validation: 2,730 fraud / 106 cleared (96.26%)     Test: 3,065 fraud / 142 cleared (95.57%)",
                    "Fraud-heavy selection affects precision, F1 and AP; the ML score is not calibrated."],21)
    f.save(["Validation metrics are selection results; October is the frozen held-out evaluation.","AP means Average Precision, not trapezoidal precision–recall area."],"backend/ml/results/validation_metrics.json; test_metrics.json; selection.json")


if __name__=='__main__':
    for fn in [architecture,pipeline,workflow,graph,comparison,confusion,temporal,features,shadow,results]:fn()
    print('Created 10 SVG figures from saved evidence; no experiments executed.')
