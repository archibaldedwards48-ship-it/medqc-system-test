import json

def generate_d6_disease_staging():
    data = []

    # TNM 肿瘤分期 (15种，每种4-5期)
    tnm_diseases = {
        "肺癌": "C34",
        "胃癌": "C16",
        "肝癌": "C22",
        "结直肠癌": "C18",
        "乳腺癌": "C50",
        "食管癌": "C15",
        "胰腺癌": "C25",
        "肾癌": "C64",
        "膀胱癌": "C67",
        "前列腺癌": "C61",
        "宫颈癌": "C53",
        "卵巢癌": "C56",
        "甲状腺癌": "C73",
        "黑色素瘤": "C43",
        "淋巴瘤": "C85",
    }

    for disease, icd_code in tnm_diseases.items():
        for stage_info in [
            {"stage": "I期", "criteria": "T1-2N0M0", "description": "肿瘤局限于原发器官，无淋巴结转移"},
            {"stage": "II期", "criteria": "T1-2N1M0 或 T3N0M0", "description": "肿瘤侵犯同侧淋巴结"},
            {"stage": "III期", "criteria": "T3-4N1-2M0", "description": "局部晚期，区域淋巴结广泛受累"},
            {"stage": "IV期", "criteria": "任何T任何NM1", "description": "远处转移"},
        ]:
            data.append({
                "disease": disease,
                "icdCode": icd_code,
                "stagingSystem": "TNM",
                "stages": [stage_info],
                "category": "肿瘤分期"
            })

    # NYHA 心功能分级
    nyha_diseases = {
        "心力衰竭": "I50",
        "风湿性心脏病": "I09",
        "扩张型心肌病": "I42.0",
    }
    for disease, icd_code in nyha_diseases.items():
        for stage_info in [
            {"stage": "I级", "criteria": "无症状，日常活动不受限", "description": "体力活动不受限制"},
            {"stage": "II级", "criteria": "日常活动轻度受限，休息时无症状", "description": "体力活动轻度受限"},
            {"stage": "III级", "criteria": "日常活动明显受限，休息时无症状", "description": "体力活动明显受限"},
            {"stage": "IV级", "criteria": "任何体力活动均引起症状，休息时亦有症状", "description": "不能进行任何体力活动"},
        ]:
            data.append({
                "disease": disease,
                "icdCode": icd_code,
                "stagingSystem": "NYHA",
                "stages": [stage_info],
                "category": "心功能分级"
            })

    # CKD 慢性肾病分期
    ckd_diseases = {
        "慢性肾病": "N18",
        "糖尿病肾病": "E10.2",
        "高血压肾病": "I12",
    }
    for disease, icd_code in ckd_diseases.items():
        for stage_info in [
            {"stage": "1期", "criteria": "GFR ≥ 90 mL/min/1.73m²", "description": "肾功能正常或升高，伴有肾损伤证据"},
            {"stage": "2期", "criteria": "GFR 60-89 mL/min/1.73m²", "description": "肾功能轻度下降，伴有肾损伤证据"},
            {"stage": "3期", "criteria": "GFR 30-59 mL/min/1.73m²", "description": "肾功能中度下降"},
            {"stage": "4期", "criteria": "GFR 15-29 mL/min/1.73m²", "description": "肾功能重度下降"},
            {"stage": "5期", "criteria": "GFR < 15 mL/min/1.73m² 或透析", "description": "终末期肾病"},
        ]:
            data.append({
                "disease": disease,
                "icdCode": icd_code,
                "stagingSystem": "CKD",
                "stages": [stage_info],
                "category": "肾病分期"
            })

    # COPD GOLD 分级
    for stage_info in [
        {"stage": "I级 (轻度)", "criteria": "FEV1/FVC < 0.70 且 FEV1 ≥ 80% 预计值", "description": "轻度气流受限"},
        {"stage": "II级 (中度)", "criteria": "FEV1/FVC < 0.70 且 50% ≤ FEV1 < 80% 预计值", "description": "中度气流受限"},
        {"stage": "III级 (重度)", "criteria": "FEV1/FVC < 0.70 且 30% ≤ FEV1 < 50% 预计值", "description": "重度气流受限"},
        {"stage": "IV级 (极重度)", "criteria": "FEV1/FVC < 0.70 且 FEV1 < 30% 预计值 或 FEV1 < 50% 预计值伴慢性呼吸衰竭", "description": "极重度气流受限"},
    ]:
        data.append({
            "disease": "慢性阻塞性肺疾病",
            "icdCode": "J44",
            "stagingSystem": "GOLD",
            "stages": [stage_info],
            "category": "肺病分级"
        })

    # 肝硬化 Child-Pugh 分级
    child_pugh_diseases = {
        "肝硬化": "K74",
        "肝衰竭": "K72",
    }
    for disease, icd_code in child_pugh_diseases.items():
        for stage_info in [
            {"stage": "A级", "criteria": "5-6分", "description": "肝功能代偿良好"},
            {"stage": "B级", "criteria": "7-9分", "description": "肝功能失代偿"},
            {"stage": "C级", "criteria": "10-15分", "description": "肝功能严重失代偿"},
        ]:
            data.append({
                "disease": disease,
                "icdCode": icd_code,
                "stagingSystem": "Child-Pugh",
                "stages": [stage_info],
                "category": "肝病分级"
            })

    # 高血压分级
    for stage_info in [
        {"stage": "1级", "criteria": "收缩压140-159 mmHg 或 舒张压90-99 mmHg", "description": "轻度高血压"},
        {"stage": "2级", "criteria": "收缩压160-179 mmHg 或 舒张压100-109 mmHg", "description": "中度高血压"},
        {"stage": "3级", "criteria": "收缩压≥180 mmHg 或 舒张压≥110 mmHg", "description": "重度高血压"},
    ]:
        data.append({
            "disease": "高血压",
            "icdCode": "I10",
            "stagingSystem": "分级",
            "stages": [stage_info],
            "category": "心血管分级"
        })
    for stage_info in [
        {"stage": "低危", "criteria": "无靶器官损害，无糖尿病，无心血管疾病", "description": "未来10年心血管事件风险<15%"},
        {"stage": "中危", "criteria": "1-2个危险因素，无靶器官损害", "description": "未来10年心血管事件风险15-20%"},
        {"stage": "高危", "criteria": "≥3个危险因素 或 靶器官损害 或 糖尿病", "description": "未来10年心血管事件风险20-30%"},
        {"stage": "很高危", "criteria": "已有心血管疾病 或 糖尿病伴靶器官损害", "description": "未来10年心血管事件风险>30%"},
    ]:
        data.append({
            "disease": "高血压",
            "icdCode": "I10",
            "stagingSystem": "危险分层",
            "stages": [stage_info],
            "category": "心血管分级"
        })

    # 糖尿病并发症分期：视网膜病变、肾病、神经病变各 3-5 期
    for stage_info in [
        {"stage": "非增殖期", "criteria": "微动脉瘤、出血、硬性渗出", "description": "早期病变"},
        {"stage": "增殖前期", "criteria": "棉絮斑、静脉串珠样改变", "description": "进展期病变"},
        {"stage": "增殖期", "criteria": "新生血管形成、玻璃体出血", "description": "晚期病变"},
    ]:
        data.append({
            "disease": "糖尿病视网膜病变",
            "icdCode": "E10.3",
            "stagingSystem": "分期",
            "stages": [stage_info],
            "category": "糖尿病并发症分期"
        })
    for stage_info in [
        {"stage": "I期", "criteria": "肾小球高滤过，肾脏肥大", "description": "早期功能亢进"},
        {"stage": "II期", "criteria": "正常白蛋白尿，肾脏病理改变", "description": "正常白蛋白尿期"},
        {"stage": "III期", "criteria": "微量白蛋白尿", "description": "早期肾病期"},
        {"stage": "IV期", "criteria": "临床白蛋白尿", "description": "临床肾病期"},
        {"stage": "V期", "criteria": "终末期肾病", "description": "终末期肾病"},
    ]:
        data.append({
            "disease": "糖尿病肾病",
            "icdCode": "E10.2",
            "stagingSystem": "分期",
            "stages": [stage_info],
            "category": "糖尿病并发症分期"
        })
    for stage_info in [
        {"stage": "无症状期", "criteria": "神经传导速度异常", "description": "无临床症状"},
        {"stage": "症状期", "criteria": "感觉异常、疼痛、麻木", "description": "出现临床症状"},
        {"stage": "并发症期", "criteria": "足溃疡、Charcot关节", "description": "出现严重并发症"},
    ]:
        data.append({
            "disease": "糖尿病周围神经病变",
            "icdCode": "E10.4",
            "stagingSystem": "分期",
            "stages": [stage_info],
            "category": "糖尿病并发症分期"
        })

    # Burns 烧伤分度
    for stage_info in [
        {"stage": "I度", "criteria": "红斑，无水疱", "description": "表皮损伤"},
        {"stage": "浅II度", "criteria": "水疱，基底潮红", "description": "真皮浅层损伤"},
        {"stage": "深II度", "criteria": "水疱，基底苍白，痛觉迟钝", "description": "真皮深层损伤"},
        {"stage": "III度", "criteria": "焦痂，无痛觉", "description": "全层皮肤损伤"},
    ]:
        data.append({
            "disease": "烧伤",
            "icdCode": "T30",
            "stagingSystem": "分度",
            "stages": [stage_info],
            "category": "创伤分度"
        })

    # 骨折 AO 分型：常见 10 种骨折 (简化处理，每种2-3个分型)
    ao_fractures = {
        "股骨颈骨折": "S72.0",
        "股骨干骨折": "S72.3",
        "胫骨平台骨折": "S82.1",
        "踝关节骨折": "S82.8",
        "桡骨远端骨折": "S52.5",
        "肱骨近端骨折": "S42.2",
        "肱骨干骨折": "S42.3",
        "锁骨骨折": "S42.0",
        "脊柱压缩性骨折": "S32.0",
        "骨盆骨折": "S32.8",
        "股骨髁上骨折": "S72.4",
        "胫骨干骨折": "S82.2",
        "跟骨骨折": "S92.0",
        "舟骨骨折": "S62.0",
        "指骨骨折": "S62.6",
    }

    for fracture, icd_code in ao_fractures.items():
        for stage_info in [
            {"stage": "A型", "criteria": "简单骨折", "description": "骨折线单一"},
            {"stage": "B型", "criteria": "楔形骨折", "description": "有中间骨块"},
            {"stage": "C型", "criteria": "复杂骨折", "description": "粉碎性骨折"},
        ]:
            data.append({
                "disease": fracture,
                "icdCode": icd_code,
                "stagingSystem": "AO分型",
                "stages": [stage_info],
                "category": "骨折分型"
            })

    # WHO Performance Status (ECOG PS)
    for stage_info in [
        {"stage": "0分", "criteria": "活动完全正常，无任何症状", "description": "完全活动"},
        {"stage": "1分", "criteria": "可自由活动，但不能从事重体力劳动", "description": "轻度症状"},
        {"stage": "2分", "criteria": "可自由活动，但不能从事任何工作，日间卧床时间少于50%", "description": "中度症状"},
        {"stage": "3分", "criteria": "日间卧床时间多于50%，但可生活自理", "description": "重度症状"},
        {"stage": "4分", "criteria": "完全卧床，生活不能自理", "description": "完全卧床"},
    ]:
        data.append({
            "disease": "肿瘤患者一般状况",
            "icdCode": "Z08.8",
            "stagingSystem": "ECOG PS",
            "stages": [stage_info],
            "category": "一般状况评分"
        })

    # Glasgow Coma Scale (GCS)
    for stage_info in [
        {"stage": "3-8分", "criteria": "重度意识障碍", "description": "昏迷"},
        {"stage": "9-12分", "criteria": "中度意识障碍", "description": "嗜睡或昏睡"},
        {"stage": "13-15分", "criteria": "轻度意识障碍", "description": "清醒或定向力障碍"},
    ]:
        data.append({
            "disease": "意识障碍",
            "icdCode": "R40.2",
            "stagingSystem": "GCS",
            "stages": [stage_info],
            "category": "神经功能评分"
        })

    # ASA Physical Status Classification System
    for stage_info in [
        {"stage": "I级", "criteria": "健康患者", "description": "无系统性疾病"},
        {"stage": "II级", "criteria": "轻度系统性疾病", "description": "如轻度高血压、糖尿病"},
        {"stage": "III级", "criteria": "重度系统性疾病", "description": "如控制不佳的高血压、糖尿病"},
        {"stage": "IV级", "criteria": "危及生命的重度系统性疾病", "description": "如不稳定心绞痛、重度COPD"},
        {"stage": "V级", "criteria": "濒死患者", "description": "预计24小时内死亡"},
        {"stage": "VI级", "criteria": "脑死亡患者", "description": "器官捐献者"},
    ]:
        data.append({
            "disease": "麻醉风险评估",
            "icdCode": "Z01.8",
            "stagingSystem": "ASA PS",
            "stages": [stage_info],
            "category": "麻醉风险评估"
        })

    # Forrest Classification for peptic ulcer bleeding
    for stage_info in [
        {"stage": "Ia", "criteria": "活动性喷射状出血", "description": "高危"},
        {"stage": "Ib", "criteria": "活动性渗血", "description": "高危"},
        {"stage": "IIa", "criteria": "非活动性可见血管", "description": "中危"},
        {"stage": "IIb", "criteria": "非活动性附着血凝块", "description": "中危"},
        {"stage": "IIc", "criteria": "非活动性黑色斑点基底", "description": "低危"},
        {"stage": "III", "criteria": "清洁基底", "description": "低危"},
    ]:
        data.append({
            "disease": "消化性溃疡出血",
            "icdCode": "K27.4",
            "stagingSystem": "Forrest",
            "stages": [stage_info],
            "category": "消化道出血分级"
        })

    # Modified Rankin Scale (mRS) for stroke outcome
    for stage_info in [
        {"stage": "0分", "criteria": "无症状", "description": "完全恢复"},
        {"stage": "1分", "criteria": "无明显残疾", "description": "能够完成所有日常活动"},
        {"stage": "2分", "criteria": "轻度残疾", "description": "不能完成所有病前活动，但可独立生活"},
        {"stage": "3分", "criteria": "中度残疾", "description": "需要一些帮助，但无需他人持续照护"},
        {"stage": "4分", "criteria": "中重度残疾", "description": "需要持续照护，不能独立行走或生活"},
        {"stage": "5分", "criteria": "重度残疾", "description": "卧床不起，大小便失禁，需要持续护理"},
        {"stage": "6分", "criteria": "死亡", "description": "死亡"},
    ]:
        data.append({
            "disease": "脑卒中功能预后",
            "icdCode": "I63",
            "stagingSystem": "mRS",
            "stages": [stage_info],
            "category": "神经功能评分"
        })

    output_path = "data/d6_disease_staging.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(data)} disease staging entries. Output saved to {output_path}")

if __name__ == "__main__":
    generate_d6_disease_staging()
