import json

def generate_d2_soap_templates():
    diseases = [
        "高血压", "2型糖尿病", "冠心病", "心力衰竭", "房颤", "脑梗死", "肺炎", "慢阻肺", "哮喘",
        "肝硬化", "消化性溃疡", "急性胰腺炎", "慢性肾病", "肾结石", "贫血", "甲亢", "痛风",
        "类风湿关节炎", "腰椎间盘突出", "骨折", "阑尾炎", "胆囊炎", "乳腺癌", "肺癌", "胃癌",
        "抑郁症", "癫痫", "帕金森病", "深静脉血栓", "败血症"
    ]

    soap_templates = []
    for disease in diseases:
        template = {
            "disease": disease,
            "icdCode": f"ICD-{disease[0]}{len(disease)}", # Placeholder ICD code
            "subjective": f"{disease}相关主诉：例如头晕、头痛、乏力等，持续X天/月/年...",
            "objective": f"{disease}相关客观检查：例如BP XXX/XXX mmHg，心率XX次/分，体温XX℃，实验室检查异常等...",
            "assessment": f"{disease}诊断评估：例如{disease}X级（极高危/高危/中危），病情稳定/进展/恶化...",
            "plan": f"{disease}治疗计划：1. 药物调整 2. 生活方式干预 3. 定期复查 4. 健康教育..."
        }
        soap_templates.append(template)

    output_path = "data/d2_soap_templates.json"
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(soap_templates, f, ensure_ascii=False, indent=2)
    
    print(f"Generated {len(soap_templates)} SOAP templates.")
    print(f"Output saved to {output_path}")

if __name__ == "__main__":
    generate_d2_soap_templates()
