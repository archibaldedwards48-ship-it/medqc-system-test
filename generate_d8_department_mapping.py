import json

def generate_d8_department_mapping():
    data = [
        {
            "departmentCode": "ICU",
            "departmentName": "重症医学科",
            "aliases": ["ICU", "重症监护室", "MICU", "SICU"],
            "category": "急危重症",
            "wards": ["ICU-A区", "ICU-B区"],
            "bedCount": 30,
            "specialRequirements": ["24小时监护", "呼吸机管理", "CRRT"]
        },
        {
            "departmentCode": "ER",
            "departmentName": "急诊科",
            "aliases": ["急诊", "急诊室"],
            "category": "急危重症",
            "wards": ["急诊抢救室", "急诊观察室"],
            "bedCount": 20,
            "specialRequirements": ["快速诊断", "紧急处理", "多学科协作"]
        },
        {
            "departmentCode": "CARD",
            "departmentName": "心血管内科",
            "aliases": ["心内科", "心内"],
            "category": "内科系统",
            "wards": ["心内一病区", "心内二病区"],
            "bedCount": 60,
            "specialRequirements": ["心电监护", "介入治疗", "心脏康复"]
        },
        {
            "departmentCode": "RESP",
            "departmentName": "呼吸内科",
            "aliases": ["呼吸科", "呼吸"],
            "category": "内科系统",
            "wards": ["呼吸一病区", "呼吸二病区"],
            "bedCount": 55,
            "specialRequirements": ["呼吸机支持", "支气管镜", "肺功能检查"]
        },
        {
            "departmentCode": "GASTRO",
            "departmentName": "消化内科",
            "aliases": ["消化科", "消化"],
            "category": "内科系统",
            "wards": ["消化一病区", "消化二病区"],
            "bedCount": 50,
            "specialRequirements": ["胃肠镜", "肝穿刺", "内镜下治疗"]
        },
        {
            "departmentCode": "NEPHRO",
            "departmentName": "肾脏内科",
            "aliases": ["肾内科", "肾内"],
            "category": "内科系统",
            "wards": ["肾内病区"],
            "bedCount": 40,
            "specialRequirements": ["血液透析", "腹膜透析", "肾活检"]
        },
        {
            "departmentCode": "ENDO",
            "departmentName": "内分泌科",
            "aliases": ["内分泌"],
            "category": "内科系统",
            "wards": ["内分泌病区"],
            "bedCount": 45,
            "specialRequirements": ["血糖管理", "甲状腺功能评估", "骨密度检查"]
        },
        {
            "departmentCode": "HEMA",
            "departmentName": "血液内科",
            "aliases": ["血液科"],
            "category": "内科系统",
            "wards": ["血液病区"],
            "bedCount": 35,
            "specialRequirements": ["骨髓穿刺", "化疗", "造血干细胞移植"]
        },
        {
            "departmentCode": "RHEUM",
            "departmentName": "风湿免疫科",
            "aliases": ["风湿科"],
            "category": "内科系统",
            "wards": ["风湿免疫病区"],
            "bedCount": 30,
            "specialRequirements": ["免疫抑制剂治疗", "关节腔穿刺"]
        },
        {
            "departmentCode": "NEURO",
            "departmentName": "神经内科",
            "aliases": ["神内科", "神内"],
            "category": "内科系统",
            "wards": ["神内一病区", "神内二病区"],
            "bedCount": 60,
            "specialRequirements": ["脑电图", "肌电图", "神经康复"]
        },
        {
            "departmentCode": "INFECT",
            "departmentName": "感染科",
            "aliases": ["传染科"],
            "category": "内科系统",
            "wards": ["感染病区"],
            "bedCount": 30,
            "specialRequirements": ["隔离管理", "抗感染治疗"]
        },
        {
            "departmentCode": "GSURG",
            "departmentName": "普通外科",
            "aliases": ["普外科", "普外"],
            "category": "外科系统",
            "wards": ["普外一病区", "普外二病区"],
            "bedCount": 70,
            "specialRequirements": ["腹腔镜手术", "胃肠道手术", "甲状腺手术"]
        },
        {
            "departmentCode": "ORTHO",
            "departmentName": "骨科",
            "aliases": ["骨外科"],
            "category": "外科系统",
            "wards": ["骨科一病区", "骨科二病区"],
            "bedCount": 80,
            "specialRequirements": ["关节置换", "脊柱手术", "创伤修复"]
        },
        {
            "departmentCode": "CTS",
            "departmentName": "心胸外科",
            "aliases": ["胸外科", "心外科"],
            "category": "外科系统",
            "wards": ["心胸外科病区"],
            "bedCount": 40,
            "specialRequirements": ["心脏搭桥", "肺叶切除", "食管癌手术"]
        },
        {
            "departmentCode": "URO",
            "departmentName": "泌尿外科",
            "aliases": ["泌外"],
            "category": "外科系统",
            "wards": ["泌尿外科病区"],
            "bedCount": 45,
            "specialRequirements": ["肾移植", "膀胱镜", "前列腺手术"]
        },
        {
            "departmentCode": "NSURG",
            "departmentName": "神经外科",
            "aliases": ["神外科", "神外"],
            "category": "外科系统",
            "wards": ["神经外科病区"],
            "bedCount": 50,
            "specialRequirements": ["脑肿瘤切除", "脑血管介入", "脊髓手术"]
        },
        {
            "departmentCode": "PLAST",
            "departmentName": "烧伤整形科",
            "aliases": ["整形外科"],
            "category": "外科系统",
            "wards": ["烧伤病区", "整形病区"],
            "bedCount": 30,
            "specialRequirements": ["烧伤治疗", "皮肤移植", "美容整形"]
        },
        {
            "departmentCode": "OBGYN",
            "departmentName": "妇产科",
            "aliases": ["妇科", "产科"],
            "category": "妇产科",
            "wards": ["妇科病区", "产科病区"],
            "bedCount": 60,
            "specialRequirements": ["分娩", "妇科肿瘤手术", "产前检查"]
        },
        {
            "departmentCode": "PED",
            "departmentName": "儿科",
            "aliases": ["儿内科", "儿外科"],
            "category": "儿科",
            "wards": ["儿科病区", "新生儿病区"],
            "bedCount": 50,
            "specialRequirements": ["儿童常见病", "新生儿监护", "儿童保健"]
        },
        {
            "departmentCode": "OPHTH",
            "departmentName": "眼科",
            "aliases": ["眼耳鼻喉科"],
            "category": "五官科",
            "wards": ["眼科病区"],
            "bedCount": 25,
            "specialRequirements": ["白内障手术", "眼底检查", "激光治疗"]
        },
        {
            "departmentCode": "ENT",
            "departmentName": "耳鼻咽喉科",
            "aliases": ["耳鼻喉科"],
            "category": "五官科",
            "wards": ["耳鼻喉科病区"],
            "bedCount": 25,
            "specialRequirements": ["听力检查", "鼻内镜手术", "扁桃体切除"]
        },
        {
            "departmentCode": "ORAL",
            "departmentName": "口腔科",
            "aliases": ["口腔颌面外科"],
            "category": "五官科",
            "wards": ["口腔科病区"],
            "bedCount": 20,
            "specialRequirements": ["牙齿种植", "颌面部手术", "口腔修复"]
        },
        {
            "departmentCode": "DERM",
            "departmentName": "皮肤科",
            "aliases": ["皮肤性病科"],
            "category": "其他",
            "wards": ["皮肤科病区"],
            "bedCount": 15,
            "specialRequirements": ["皮肤病诊断", "激光治疗", "皮肤活检"]
        },
        {
            "departmentCode": "TCM",
            "departmentName": "中医科",
            "aliases": ["中西医结合科"],
            "category": "其他",
            "wards": ["中医科病区"],
            "bedCount": 20,
            "specialRequirements": ["中医辨证", "针灸", "中药治疗"]
        },
        {
            "departmentCode": "REHAB",
            "departmentName": "康复医学科",
            "aliases": ["康复科"],
            "category": "其他",
            "wards": ["康复病区"],
            "bedCount": 30,
            "specialRequirements": ["物理治疗", "作业治疗", "言语治疗"]
        },
        {
            "departmentCode": "ONCO",
            "departmentName": "肿瘤科",
            "aliases": ["肿瘤内科", "肿瘤外科"],
            "category": "其他",
            "wards": ["肿瘤一病区", "肿瘤二病区"],
            "bedCount": 50,
            "specialRequirements": ["化疗", "放疗", "靶向治疗"]
        },
        {
            "departmentCode": "GERI",
            "departmentName": "老年医学科",
            "aliases": ["老年科"],
            "category": "其他",
            "wards": ["老年病区"],
            "bedCount": 30,
            "specialRequirements": ["老年综合评估", "多重用药管理"]
        },
        {
            "departmentCode": "PSYCH",
            "departmentName": "精神医学科",
            "aliases": ["精神科"],
            "category": "其他",
            "wards": ["精神科病区"],
            "bedCount": 40,
            "specialRequirements": ["心理治疗", "药物治疗", "电休克治疗"]
        },
        {
            "departmentCode": "ANESTH",
            "departmentName": "麻醉科",
            "aliases": ["麻醉"],
            "category": "其他",
            "wards": ["麻醉恢复室"],
            "bedCount": 10,
            "specialRequirements": ["术中麻醉管理", "疼痛管理"]
        },
        {
            "departmentCode": "PATH",
            "departmentName": "病理科",
            "aliases": ["病理"],
            "category": "其他",
            "wards": [],
            "bedCount": 0,
            "specialRequirements": ["组织病理诊断", "细胞学诊断"]
        },
        {
            "departmentCode": "RADI",
            "departmentName": "放射科",
            "aliases": ["影像科"],
            "category": "其他",
            "wards": [],
            "bedCount": 0,
            "specialRequirements": ["X线", "CT", "MRI", "超声"]
        },
        {
            "departmentCode": "LAB",
            "departmentName": "检验科",
            "aliases": ["化验室"],
            "category": "其他",
            "wards": [],
            "bedCount": 0,
            "specialRequirements": ["血液检验", "生化检验", "免疫检验"]
        }
    ]

    output_path = "data/d8_department_mapping.json"
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"Generated {len(data)} department mapping entries. Output saved to {output_path}")

if __name__ == "__main__":
    generate_d8_department_mapping()
