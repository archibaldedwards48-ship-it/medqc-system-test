import { useState, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, BookOpen, AlertCircle, Filter } from "lucide-react";

interface SoapTemplate {
  disease: string;
  icdCode: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  department?: string;
}

interface DepartmentInfo {
  code: string;
  name: string;
  category: string;
}

export default function SoapTemplates() {
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDept, setSelectedDept] = useState<string | null>(null);

  // 获取科室列表
  const { data: departments = [] } = trpc.templates.departments.useQuery();

  // 获取模板列表（按科室过滤）
  const { data: templates = [], isLoading: isLoadingList, error: listError } = trpc.templates.listByDepartment.useQuery({
    department: selectedDept || undefined,
  });

  // 解析模板数据
  const parsedTemplates = useMemo(() => {
    return templates.map((t) => {
      const template = t as SoapTemplate;
      return {
        id: `${template.disease}-${template.icdCode}`,
        disease: template.disease,
        icdCode: template.icdCode,
        department: template.department || 'GEN',
        soap: template,
      };
    });
  }, [templates]);

  // 搜索过滤
  const filteredTemplates = useMemo(() => {
    return parsedTemplates.filter((t) =>
      t.disease.toLowerCase().includes(search.toLowerCase()) ||
      t.icdCode.toLowerCase().includes(search.toLowerCase())
    );
  }, [parsedTemplates, search]);

  // 设置初始选中项
  const selectedTemplate = selectedId
    ? parsedTemplates.find((t) => t.id === selectedId)
    : filteredTemplates[0];

  // 按科室分组统计
  const deptStats = useMemo(() => {
    const stats: Record<string, number> = {};
    parsedTemplates.forEach((t) => {
      stats[t.department] = (stats[t.department] || 0) + 1;
    });
    return stats;
  }, [parsedTemplates]);

  // 加载状态
  if (isLoadingList && !selectedDept) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">SOAP 模板库</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              浏览和查看各类疾病的 SOAP 诊疗模板
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          <Skeleton className="h-96" />
          <Skeleton className="h-96 lg:col-span-3" />
        </div>
      </div>
    );
  }

  // 错误状态
  if (listError) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">SOAP 模板库</h1>
          </div>
        </div>
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="pt-6 flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-destructive" />
            <div>
              <p className="font-medium text-destructive">加载失败</p>
              <p className="text-sm text-muted-foreground">{listError.message}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 空状态
  if (parsedTemplates.length === 0) {
    return (
      <div className="p-6 space-y-5">
        <div className="flex items-center gap-3">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-xl font-semibold">SOAP 模板库</h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              浏览和查看各类疾病的 SOAP 诊疗模板
            </p>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6 flex flex-col items-center justify-center h-64 text-muted-foreground">
            <BookOpen className="w-12 h-12 mb-3 opacity-50" />
            <p>暂无 SOAP 模板数据</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-5">
      {/* 页面头部 */}
      <div className="flex items-center gap-3">
        <BookOpen className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-xl font-semibold">SOAP 模板库</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            浏览和查看各类疾病的 SOAP 诊疗模板 · 共 {parsedTemplates.length} 条
          </p>
        </div>
      </div>

      {/* 主容器 - 三列布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-200px)]">
        {/* 左侧：科室导航 */}
        <Card className="border-border/60 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4" />
              <CardTitle className="text-base">科室分类</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-2 overflow-hidden">
            {/* 全部选项 */}
            <Button
              variant={!selectedDept ? "default" : "outline"}
              className="w-full justify-start h-auto py-2 px-3 text-left"
              onClick={() => setSelectedDept(null)}
            >
              <div className="flex-1">
                <div className="font-medium text-sm">全部模板</div>
                <div className="text-xs text-muted-foreground">{parsedTemplates.length} 条</div>
              </div>
            </Button>

            {/* 科室列表 */}
            <div className="flex-1 overflow-y-auto space-y-2">
              {departments.map((dept) => (
                <Button
                  key={dept.code}
                  variant={selectedDept === dept.code ? "default" : "outline"}
                  className="w-full justify-start h-auto py-2 px-3 text-left"
                  onClick={() => setSelectedDept(dept.code)}
                >
                  <div className="flex-1">
                    <div className="font-medium text-sm">{dept.name}</div>
                    <div className="text-xs text-muted-foreground">
                      {deptStats[dept.code] || 0} 条
                    </div>
                  </div>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 中间：疾病列表 */}
        <Card className="border-border/60 lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">
              疾病列表
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                {filteredTemplates.length}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col gap-3 overflow-hidden">
            {/* 搜索框 */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="搜索疾病..."
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
                    onClick={() => setSelectedId(template.id)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{template.disease}</div>
                      <div className="text-xs text-muted-foreground">{template.icdCode}</div>
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
                <CardTitle className="text-base">{selectedTemplate?.disease}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">
                  ICD 代码：{selectedTemplate?.icdCode}
                </p>
              </div>
              <Badge variant="secondary">{selectedTemplate?.icdCode}</Badge>
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
