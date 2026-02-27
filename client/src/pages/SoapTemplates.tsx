import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen } from "lucide-react";

// Mock SOAP 模板数据
const MOCK_SOAP_TEMPLATES = [
  {
    id: 1,
    diseaseName: "高血压",
    diseaseCode: "I10",
    soap: {
      subjective: "患者主诉头晕、头痛，伴随疲劳感。否认胸痛、呼吸困难。",
      objective: "血压：160/100 mmHg，脉搏：88 次/分，体温：36.5°C。心率规则，无杂音。",
      assessment: "原发性高血压（WHO 分级 2 级）",
      plan: "1. 启动降压药物治疗（首选 ACE 抑制剂）\n2. 建议低盐饮食、适度运动\n3. 定期监测血压\n4. 复诊时间：2 周后",
    },
  },
  {
    id: 2,
    diseaseName: "2 型糖尿病",
    diseaseCode: "E11",
    soap: {
      subjective: "患者诉多饮、多尿、体重下降 3 个月。否认视物模糊。",
      objective: "血糖：8.5 mmol/L，HbA1c：7.2%，BMI：28.5。",
      assessment: "2 型糖尿病，血糖控制欠佳",
      plan: "1. 加强饮食管理和运动\n2. 调整降糖药物剂量\n3. 监测血糖和 HbA1c\n4. 复诊：1 个月后",
    },
  },
  {
    id: 3,
    diseaseName: "冠心病",
    diseaseCode: "I25",
    soap: {
      subjective: "患者诉胸痛，放射至左肩，活动后加重，休息后缓解。",
      objective: "心电图：ST 段压低 1-2mm，肌钙蛋白升高。血压：145/95 mmHg。",
      assessment: "急性冠脉综合征，不稳定心绞痛",
      plan: "1. 立即住院治疗\n2. 双联抗血小板聚集\n3. 肝素抗凝\n4. 考虑冠脉造影\n5. 监测心电图和生物标志物",
    },
  },
  {
    id: 4,
    diseaseName: "肺炎",
    diseaseCode: "J18",
    soap: {
      subjective: "患者诉咳嗽、咳痰 5 天，伴发热 38.5°C，乏力。",
      objective: "肺部听诊：左下肺可闻及湿性啰音。胸片：左下肺浸润影。WBC：12.5×10^9/L。",
      assessment: "社区获得性肺炎（CAP），轻度",
      plan: "1. 抗生素治疗（首选青霉素类）\n2. 对症治疗（退热、止咳）\n3. 胸片复查\n4. 复诊：3-5 天后",
    },
  },
  {
    id: 5,
    diseaseName: "胃炎",
    diseaseCode: "K29",
    soap: {
      subjective: "患者诉上腹痛 1 周，进食后加重，伴恶心、反酸。",
      objective: "腹部检查：上腹部轻压痛，无反跳痛。幽门螺杆菌：阳性。",
      assessment: "慢性胃炎，幽门螺杆菌阳性",
      plan: "1. 三联疗法根除 Hp\n2. 质子泵抑制剂保护胃黏膜\n3. 饮食调理\n4. 复诊：2 周后复查 Hp",
    },
  },
  {
    id: 6,
    diseaseName: "抑郁症",
    diseaseCode: "F32",
    soap: {
      subjective: "患者诉心情低落 2 个月，兴趣减退，睡眠不佳，有轻生念头。",
      objective: "精神检查：表情淡漠，语速缓慢，思维迟缓。PHQ-9 评分：18 分。",
      assessment: "中度抑郁症",
      plan: "1. 启动抗抑郁药物（SSRI）\n2. 心理治疗\n3. 监测自杀风险\n4. 复诊：2 周后评估疗效",
    },
  },
];

export default function SoapTemplates() {
  const [search, setSearch] = useState("");
  const [selectedTemplate, setSelectedTemplate] = useState<(typeof MOCK_SOAP_TEMPLATES)[0] | null>(
    MOCK_SOAP_TEMPLATES[0]
  );

  // TODO: 后端接口完成后，取消注释以下代码
  // const { data: templates, isLoading } = trpc.templates.list.useQuery();

  // 搜索过滤
  const filteredTemplates = useMemo(() => {
    return MOCK_SOAP_TEMPLATES.filter((t) =>
      t.diseaseName.toLowerCase().includes(search.toLowerCase()) ||
      t.diseaseCode.toLowerCase().includes(search.toLowerCase())
    );
  }, [search]);

  return (
    <div className="p-6 space-y-5">
      {/* 页面头部 */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">SOAP 模板库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            浏览和查看各类疾病的 SOAP 诊疗模板
          </p>
        </div>
      </div>

      {/* 主容器 - 两列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
        {/* 左侧：疾病列表 */}
        <Card className="border-border/60 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">疾病列表</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索疾病名称..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* 疾病列表 */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {filteredTemplates.length === 0 ? (
                <div className="flex items-center justify-center h-32 text-muted-foreground text-sm">
                  未找到匹配的疾病
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Button
                    key={template.id}
                    variant={selectedTemplate?.id === template.id ? "default" : "outline"}
                    className="w-full justify-start h-auto py-2 px-3 text-left"
                    onClick={() => setSelectedTemplate(template)}
                  >
                    <div className="flex-1">
                      <div className="font-medium text-sm">{template.diseaseName}</div>
                      <div className="text-xs text-muted-foreground">{template.diseaseCode}</div>
                    </div>
                  </Button>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 右侧：SOAP 模板详情 */}
        <Card className="border-border/60 lg:col-span-2 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">{selectedTemplate?.diseaseName}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  疾病代码：{selectedTemplate?.diseaseCode}
                </p>
              </div>
              <Badge variant="secondary">{selectedTemplate?.diseaseCode}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-y-auto space-y-4">
            {selectedTemplate ? (
              <>
                {/* S - 主观信息 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-blue-100 text-blue-800">S</Badge>
                    <span className="font-semibold text-sm">主观信息（Subjective）</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.soap.subjective}
                  </p>
                </div>

                {/* O - 客观检查 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-green-100 text-green-800">O</Badge>
                    <span className="font-semibold text-sm">客观检查（Objective）</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.soap.objective}
                  </p>
                </div>

                {/* A - 评估诊断 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-100 text-amber-800">A</Badge>
                    <span className="font-semibold text-sm">评估诊断（Assessment）</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.soap.assessment}
                  </p>
                </div>

                {/* P - 治疗计划 */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-100 text-purple-800">P</Badge>
                    <span className="font-semibold text-sm">治疗计划（Plan）</span>
                  </div>
                  <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {selectedTemplate.soap.plan}
                  </p>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                请选择一个疾病查看 SOAP 模板
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
