import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Bot, Send, Sparkles, Lightbulb } from "lucide-react";
import { Streamdown } from "streamdown";

const QUICK_PROMPTS = [
  "分析当前质控规则库中哪些规则触发频率最高？",
  "针对2型糖尿病病历，有哪些常见的质控缺陷？",
  "如何优化现有的质控评分体系？",
  "帮我生成一份心肌梗死病历的SOAP模板",
  "检验危急值处理流程有哪些质控要点？",
];

interface Message {
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

export default function AiAdvisor() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "您好！我是 MedQC AI 质控顾问。我可以帮您分析质控规则、解读检验结果、生成病历模板，以及提供临床质量管理建议。请问有什么可以帮您？",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const analyzeMutation = trpc.nlp.process.useMutation();

  const handleSend = async (text?: string) => {
    const msg = text ?? input.trim();
    if (!msg || isLoading) return;

    const userMsg: Message = { role: "user", content: msg, timestamp: new Date() };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);

    try {
      // Build context-aware prompt
      const systemPrompt = `你是一个专业的医疗质控顾问，专注于病历质量管理、临床规则审核和医疗合规性分析。
你熟悉：
- ICD-10 诊断编码规范
- 病历书写质量标准（SOAP格式）
- 检验参考范围和危急值处理
- 质控规则设计和评分体系
- 临床指南和循证医学

请用专业、简洁的中文回答，必要时使用结构化格式（列表、表格）。`;

      const response = await fetch(
        `${import.meta.env.VITE_FRONTEND_FORGE_API_URL ?? ""}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_FRONTEND_FORGE_API_KEY ?? ""}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              { role: "system", content: systemPrompt },
              ...messages.map((m) => ({ role: m.role, content: m.content })),
              { role: "user", content: msg },
            ],
            stream: false,
          }),
        }
      );

      if (!response.ok) throw new Error("AI 服务暂时不可用");

      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content ?? "抱歉，未能获取回复。";

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: reply, timestamp: new Date() },
      ]);
    } catch (err: any) {
      toast.error(err.message ?? "AI 请求失败");
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "抱歉，AI 服务暂时不可用，请稍后重试。",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 h-[calc(100vh-3rem)] flex flex-col gap-4">
      <div className="flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            AI 质控顾问
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            基于大语言模型的智能质控分析助手
          </p>
        </div>
        <Badge variant="secondary" className="text-xs">
          <Sparkles className="w-3 h-3 mr-1" />
          AI 驱动
        </Badge>
      </div>

      {/* Quick prompts */}
      <div className="flex flex-wrap gap-2 shrink-0">
        {QUICK_PROMPTS.map((prompt, i) => (
          <button
            key={i}
            onClick={() => handleSend(prompt)}
            disabled={isLoading}
            className="text-xs px-3 py-1.5 rounded-full border border-border bg-background hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Lightbulb className="w-3 h-3 inline mr-1 text-amber-500" />
            {prompt.slice(0, 20)}...
          </button>
        ))}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                msg.role === "assistant"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <Bot className="w-4 h-4" />
              ) : (
                <span className="text-xs font-bold">我</span>
              )}
            </div>
            <div
              className={`max-w-[75%] rounded-xl px-4 py-3 text-sm ${
                msg.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/60 text-foreground"
              }`}
            >
              {msg.role === "assistant" ? (
                <div className="prose prose-sm max-w-none dark:prose-invert">
                  <Streamdown>{msg.content}</Streamdown>
                </div>
              ) : (
                <p>{msg.content}</p>
              )}
              <p
                className={`text-xs mt-1.5 ${
                  msg.role === "user" ? "text-primary-foreground/60" : "text-muted-foreground"
                }`}
              >
                {msg.timestamp.toLocaleTimeString("zh-CN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex gap-3">
            <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-muted/60 rounded-xl px-4 py-3">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="w-2 h-2 rounded-full bg-muted-foreground/50 animate-bounce"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="shrink-0 flex gap-2">
        <Textarea
          placeholder="输入您的问题，例如：如何处理检验危急值？"
          rows={2}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend();
            }
          }}
          className="resize-none"
          disabled={isLoading}
        />
        <Button
          onClick={() => handleSend()}
          disabled={!input.trim() || isLoading}
          className="h-full px-4"
        >
          <Send className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
