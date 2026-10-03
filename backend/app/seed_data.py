from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from .models import (
    Location, Equipment, User, MalfunctionCode, Material,
    WorkOrder, WorkOrderEvent, WorkOrderPhoto, MaterialUsage, AIAssessment,
    WorkOrderStatus, UserRole, WorkerStatus, OrderPriority, OrderType, AIVerdict
)

def seed_database(db: Session):
    # Only seed if no locations exist
    if db.query(Location).first():
        return

    # 1. 4 Locations (Раздел 8)
    locations_data = [
        {"name": "Участок дробления", "code": "УД", "description": "Дробление и сортировка горной массы"},
        {"name": "Участок обогащения", "code": "УО", "description": "Флотация, фильтрация и сушка руды"},
        {"name": "Ремонтно-механический цех (РМЦ)", "code": "РМЦ", "description": "Механическая обработка, ремонт узлов и агрегатов"},
        {"name": "Автотранспортный цех (АТЦ)", "code": "АТЦ", "description": "Карьерная и вспомогательная техника"}
    ]
    locations = []
    for loc in locations_data:
        l = Location(**loc)
        db.add(l)
        locations.append(l)
    db.commit()

    # 2. 25 Equipment units (Раздел 8)
    equipment_data = [
        # Участок дробления (id 1)
        {"name": "Конусная дробилка КМД-1750", "inventory_number": "ИНВ-ДР-01", "location_id": 1, "equipment_type": "Дробильное", "criticality": "Критическое", "status": "WORKING"},
        {"name": "Щековая дробилка СМД-111", "inventory_number": "ИНВ-ДР-02", "location_id": 1, "equipment_type": "Дробильное", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Конвейер магистральный К-3", "inventory_number": "ИНВ-ДР-03", "location_id": 1, "equipment_type": "Транспортное", "criticality": "Критическое", "status": "REPAIR"},
        {"name": "Конвейер ленточный К-1", "inventory_number": "ИНВ-ДР-04", "location_id": 1, "equipment_type": "Транспортное", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Конвейер ленточный К-2", "inventory_number": "ИНВ-ДР-05", "location_id": 1, "equipment_type": "Транспортное", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Грохот инерционный ГИЛ-52", "inventory_number": "ИНВ-ДР-06", "location_id": 1, "equipment_type": "Сортировочное", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Питатель пластинчатый ПП-1-15", "inventory_number": "ИНВ-ДР-07", "location_id": 1, "equipment_type": "Подающее", "criticality": "Средняя", "status": "WORKING"},

        # Участок обогащения (id 2)
        {"name": "Мельница стержневая МШР 3.6х4.0", "inventory_number": "ИНВ-ОБ-01", "location_id": 2, "equipment_type": "Измельчительное", "criticality": "Критическое", "status": "WORKING"},
        {"name": "Шламовый насос 1ГрТ-1600/50", "inventory_number": "ИНВ-ОБ-02", "location_id": 2, "equipment_type": "Насосное", "criticality": "Критическое", "status": "DOWNTIME"},
        {"name": "Флотомашина ФМ-6.3 №1", "inventory_number": "ИНВ-ОБ-03", "location_id": 2, "equipment_type": "Обогатительное", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Флотомашина ФМ-6.3 №2", "inventory_number": "ИНВ-ОБ-04", "location_id": 2, "equipment_type": "Обогатительное", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Вакуум-фильтр дисковый ДОО-80", "inventory_number": "ИНВ-ОБ-05", "location_id": 2, "equipment_type": "Фильтровальное", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Сушильный барабан БС-2.8", "inventory_number": "ИНВ-ОБ-06", "location_id": 2, "equipment_type": "Термическое", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Вентилятор радиальный ВЦ-14-46", "inventory_number": "ИНВ-ОБ-07", "location_id": 2, "equipment_type": "Вентиляционное", "criticality": "Низкая", "status": "WORKING"},

        # РМЦ (id 3)
        {"name": "Токарно-винторезный станок 1К62", "inventory_number": "ИНВ-РМ-01", "location_id": 3, "equipment_type": "Станочное", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Радиально-сверлильный станок 2Н55", "inventory_number": "ИНВ-РМ-02", "location_id": 3, "equipment_type": "Станочное", "criticality": "Низкая", "status": "WORKING"},
        {"name": "Пресс гидравлический П6330 (100т)", "inventory_number": "ИНВ-РМ-03", "location_id": 3, "equipment_type": "Прессовое", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Мостовой кран 10т РМЦ", "inventory_number": "ИНВ-РМ-04", "location_id": 3, "equipment_type": "Подъемное", "criticality": "Критическое", "status": "WORKING"},
        {"name": "Сварочный пост Kemppi MasterTig", "inventory_number": "ИНВ-РМ-05", "location_id": 3, "equipment_type": "Сварочное", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Компрессор винтовой Атлас Копко GA-55", "inventory_number": "ИНВ-РМ-06", "location_id": 3, "equipment_type": "Компрессорное", "criticality": "Высокая", "status": "WORKING"},

        # АТЦ (id 4)
        {"name": "Самосвал БеЛАЗ-7555B №104", "inventory_number": "ИНВ-АТ-01", "location_id": 4, "equipment_type": "Карьерный транспорт", "criticality": "Критическое", "status": "WORKING"},
        {"name": "Экскаватор карьерный ЭКГ-5А", "inventory_number": "ИНВ-АТ-02", "location_id": 4, "equipment_type": "Горная выемка", "criticality": "Критическое", "status": "WORKING"},
        {"name": "Погрузчик фронтальный CAT-980", "inventory_number": "ИНВ-АТ-03", "location_id": 4, "equipment_type": "Колесная техника", "criticality": "Высокая", "status": "WORKING"},
        {"name": "Бульдозер Т-170", "inventory_number": "ИНВ-АТ-04", "location_id": 4, "equipment_type": "Гусеничная техника", "criticality": "Средняя", "status": "WORKING"},
        {"name": "Автогрейдер ДЗ-98", "inventory_number": "ИНВ-АТ-05", "location_id": 4, "equipment_type": "Дорожная техника", "criticality": "Низкая", "status": "WORKING"}
    ]
    for eq in equipment_data:
        db.add(Equipment(**eq))
    db.commit()

    # 3. 2 Masters and 15 Executors in 3 Brigades (Раздел 8)
    users_data = [
        # Masters
        {"full_name": "Ахметов Нурлан К.", "specialty": "Мастер смены", "rank": 6, "brigade": "Бригада №1", "role": UserRole.MASTER.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.BUSY.value, "phone": "+7 777 101-01-01", "rating": 98.0},
        {"full_name": "Сарсенов Данияр Б.", "specialty": "Мастер смены", "rank": 6, "brigade": "Бригада №2", "role": UserRole.MASTER.value, "shift": "Ночная смена 2", "current_status": WorkerStatus.OFF_SHIFT.value, "phone": "+7 777 102-02-02", "rating": 96.0},

        # Brigade 1 (Механическая)
        {"full_name": "Ахметов Ерик С.", "specialty": "Слесарь-ремонтник", "rank": 5, "brigade": "Бригада №1", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 201-11-01", "rating": 96.5},
        {"full_name": "Байжанов Марат А.", "specialty": "Слесарь-ремонтник", "rank": 4, "brigade": "Бригада №1", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.BUSY.value, "phone": "+7 777 201-11-02", "rating": 91.0},
        {"full_name": "Иванов Алексей П.", "specialty": "Электромонтер", "rank": 5, "brigade": "Бригада №1", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 201-11-03", "rating": 97.2},
        {"full_name": "Сидоров Андрей В.", "specialty": "Слесарь-гидравлик", "rank": 4, "brigade": "Бригада №1", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.HAS_QUEUE.value, "phone": "+7 777 201-11-04", "rating": 83.5},
        {"full_name": "Кузнецов Дмитрий И.", "specialty": "Газоэлектросварщик", "rank": 5, "brigade": "Бригада №1", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.BUSY.value, "phone": "+7 777 201-11-05", "rating": 94.0},

        # Brigade 2 (Электромеханическая)
        {"full_name": "Каримов Тимур Р.", "specialty": "Электромонтер", "rank": 6, "brigade": "Бригада №2", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 202-22-01", "rating": 98.5},
        {"full_name": "Попов Сергей В.", "specialty": "Слесарь-ремонтник", "rank": 4, "brigade": "Бригада №2", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.BUSY.value, "phone": "+7 777 202-22-02", "rating": 89.0},
        {"full_name": "Смагулов Берик Ж.", "specialty": "Газоэлектросварщик", "rank": 4, "brigade": "Бригада №2", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 202-22-03", "rating": 92.5},
        {"full_name": "Коваленко Игорь Н.", "specialty": "Слесарь КИПиА", "rank": 5, "brigade": "Бригада №2", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.HAS_QUEUE.value, "phone": "+7 777 202-22-04", "rating": 95.0},
        {"full_name": "Жумабаев Кайрат О.", "specialty": "Смазчик-механик", "rank": 3, "brigade": "Бригада №2", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 202-22-05", "rating": 90.0},

        # Brigade 3 (Ремонт карьерной техники)
        {"full_name": "Оспанов Арман К.", "specialty": "Слесарь по ремонту карьерных машин", "rank": 5, "brigade": "Бригада №3", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 203-33-01", "rating": 94.5},
        {"full_name": "Морозов Владимир С.", "specialty": "Автоэлектрик", "rank": 5, "brigade": "Бригада №3", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.BUSY.value, "phone": "+7 777 203-33-02", "rating": 93.0},
        {"full_name": "Васильев Олег Д.", "specialty": "Слесарь-гидравлик", "rank": 4, "brigade": "Бригада №3", "role": UserRole.EXECUTOR.value, "shift": "Дневная смена 1", "current_status": WorkerStatus.FREE.value, "phone": "+7 777 203-33-03", "rating": 88.5},
        {"full_name": "Тарасов Роман А.", "specialty": "Газоэлектросварщик", "rank": 4, "brigade": "Бригада №3", "role": UserRole.EXECUTOR.value, "shift": "Ночная смена 2", "current_status": WorkerStatus.OFF_SHIFT.value, "phone": "+7 777 203-33-04", "rating": 91.0},
        {"full_name": "Сериков Мурат Т.", "specialty": "Слесарь-ремонтник", "rank": 3, "brigade": "Бригада №3", "role": UserRole.EXECUTOR.value, "shift": "Ночная смена 2", "current_status": WorkerStatus.OFF_SHIFT.value, "phone": "+7 777 203-33-05", "rating": 87.0}
    ]
    for u in users_data:
        db.add(User(**u))
    db.commit()

    # 4. 20 Malfunction codes (М, Э, Г, П, С - Раздел 8)
    codes_data = [
        # Механические (М)
        {"code": "М-01", "category": "М - Механика", "description": "Износ / разрушение подшипникового узла", "standard_hours": 2.5},
        {"code": "М-02", "category": "М - Механика", "description": "Порыв / сход ленты конвейера", "standard_hours": 3.0},
        {"code": "М-03", "category": "М - Механика", "description": "Износ брони / футеровки дробилки", "standard_hours": 4.0},
        {"code": "М-04", "category": "М - Механика", "description": "Поломка приводного вала / редуктора", "standard_hours": 4.5},
        {"code": "М-05", "category": "М - Механика", "description": "Ослабление болтовых соединений и креплений", "standard_hours": 1.0},
        
        # Электрические (Э)
        {"code": "Э-01", "category": "Э - Электрика", "description": "Короткое замыкание / пробой изоляции электродвигателя", "standard_hours": 2.0},
        {"code": "Э-02", "category": "Э - Электрика", "description": "Срабатывание тепловой защиты / автомата пускателя", "standard_hours": 0.8},
        {"code": "Э-03", "category": "Э - Электрика", "description": "Повреждение силового или контрольного кабеля", "standard_hours": 1.5},
        {"code": "Э-04", "category": "Э - Электрика", "description": "Неисправность датчика оборотов / схода ленты / КИП", "standard_hours": 1.0},

        # Гидравлика (Г)
        {"code": "Г-01", "category": "Г - Гидравлика", "description": "Течь масла в гидроцилиндре / штоке", "standard_hours": 2.0},
        {"code": "Г-02", "category": "Г - Гидравлика", "description": "Разрыв рукава высокого давления (РВД)", "standard_hours": 1.0},
        {"code": "Г-03", "category": "Г - Гидравлика", "description": "Падение давления в гидросистеме", "standard_hours": 2.5},
        {"code": "Г-04", "category": "Г - Гидравлика", "description": "Засорение масляного фильтра гидростанции", "standard_hours": 1.2},

        # Пневматика (П)
        {"code": "П-01", "category": "П - Пневматика", "description": "Утечка сжатого воздуха в трубопроводе / штуцерах", "standard_hours": 1.0},
        {"code": "П-02", "category": "П - Пневматика", "description": "Заклинивание пневмоцилиндра затвора бункера", "standard_hours": 1.8},
        {"code": "П-03", "category": "П - Пневматика", "description": "Неисправность пневмораспределителя", "standard_hours": 1.5},

        # Смазка (С)
        {"code": "С-01", "category": "С - Смазка", "description": "Перегрев узла трения из-за масляного голодания", "standard_hours": 1.0},
        {"code": "С-02", "category": "С - Смазка", "description": "Засорение автоматической централизованной системы смазки", "standard_hours": 2.0},
        {"code": "С-03", "category": "С - Смазка", "description": "Течь сальникового или манжетного уплотнения", "standard_hours": 1.5},
        {"code": "С-04", "category": "С - Смазка", "description": "Вымывание смазки из корпусов подшипников", "standard_hours": 1.2}
    ]
    for c in codes_data:
        db.add(MalfunctionCode(**c))
    db.commit()

    # 5. 40 Materials and Spare Parts (Раздел 8)
    materials_data = [
        {"code": "МАТ-01", "name": "Подшипник роликовый 22318", "unit": "шт", "category": "Подшипники", "standard_cost": 42000.0},
        {"code": "МАТ-02", "name": "Подшипник шариковый 6312-2RS", "unit": "шт", "category": "Подшипники", "standard_cost": 18500.0},
        {"code": "МАТ-03", "name": "Подшипник сферический 23224 CA/W33", "unit": "шт", "category": "Подшипники", "standard_cost": 86000.0},
        {"code": "МАТ-04", "name": "Ремень клиновой B-2240", "unit": "шт", "category": "РТИ", "standard_cost": 6500.0},
        {"code": "МАТ-05", "name": "Ремень клиновой C-3550", "unit": "шт", "category": "РТИ", "standard_cost": 12400.0},
        {"code": "МАТ-06", "name": "Лента транспортерная резинотканевая 1000х4 ТК-200", "unit": "м", "category": "РТИ", "standard_cost": 31000.0},
        {"code": "МАТ-07", "name": "Манжета армированная (сальник) 65х90х10", "unit": "шт", "category": "Уплотнения", "standard_cost": 2100.0},
        {"code": "МАТ-08", "name": "Комплект торцевых уплотнений 1ГрТ-1600", "unit": "комплект", "category": "Уплотнения", "standard_cost": 54000.0},
        {"code": "МАТ-09", "name": "Рукав высокого давления РВД DN12 350 bar", "unit": "шт", "category": "Гидравлика", "standard_cost": 16500.0},
        {"code": "МАТ-10", "name": "Фильтроэлемент напорный гидростанции 10 мкм", "unit": "шт", "category": "Гидравлика", "standard_cost": 14200.0},
        {"code": "МАТ-11", "name": "Масло гидравлическое И-40А", "unit": "л", "category": "ГСМ", "standard_cost": 950.0},
        {"code": "МАТ-12", "name": "Масло редукторное ИТД-220", "unit": "л", "category": "ГСМ", "standard_cost": 1400.0},
        {"code": "МАТ-13", "name": "Смазка пластичная Литол-24", "unit": "кг", "category": "ГСМ", "standard_cost": 1800.0},
        {"code": "МАТ-14", "name": "Смазка водостойкая Мобилгрейс XHP 222", "unit": "кг", "category": "ГСМ", "standard_cost": 4600.0},
        {"code": "МАТ-15", "name": "Электроды сварочные УОНИ-13/55 ф4мм", "unit": "кг", "category": "Сварочные", "standard_cost": 1650.0},
        {"code": "МАТ-16", "name": "Электроды сварочные МР-3 ф3мм", "unit": "кг", "category": "Сварочные", "standard_cost": 1400.0},
        {"code": "МАТ-17", "name": "Кабель силовой ВВГнг-LS 4х16", "unit": "м", "category": "Электрика", "standard_cost": 2800.0},
        {"code": "МАТ-18", "name": "Кабель контрольный КВВГнг 7х1.5", "unit": "м", "category": "Электрика", "standard_cost": 1100.0},
        {"code": "МАТ-19", "name": "Автоматический выключатель ВА 57-35 100А", "unit": "шт", "category": "Электрика", "standard_cost": 21000.0},
        {"code": "МАТ-20", "name": "Пускатель электромагнитный ПМ12-100", "unit": "шт", "category": "Электрика", "standard_cost": 32000.0},
        {"code": "МАТ-21", "name": "Датчик индуктивный бесконтактный ВБИ", "unit": "шт", "category": "КИПиА", "standard_cost": 18000.0},
        {"code": "МАТ-22", "name": "Ролик конвейерный дефлекторный 108х250", "unit": "шт", "category": "Запчасти", "standard_cost": 8900.0},
        {"code": "МАТ-23", "name": "Ролик конвейерный гладкий 127х380", "unit": "шт", "category": "Запчасти", "standard_cost": 11500.0},
        {"code": "МАТ-24", "name": "Болт высокопрочный М24х110 8.8 с гайкой", "unit": "комплект", "category": "Метизы", "standard_cost": 1200.0},
        {"code": "МАТ-25", "name": "Болт футеровочный М30х140", "unit": "шт", "category": "Метизы", "standard_cost": 2400.0},
        {"code": "МАТ-26", "name": "Комплект плит дробящих СМД-111 (подвижная+неподвижная)", "unit": "комплект", "category": "Запчасти", "standard_cost": 920000.0},
        {"code": "МАТ-27", "name": "Броня неподвижного конуса КМД-1750", "unit": "шт", "category": "Запчасти", "standard_cost": 1450000.0},
        {"code": "МАТ-28", "name": "Сетка проволочная рифленая для ГИЛ-52 (20х20мм)", "unit": "м2", "category": "Сетки", "standard_cost": 28000.0},
        {"code": "МАТ-29", "name": "Штуцер быстроразъемный пневматический G1/2", "unit": "шт", "category": "Пневматика", "standard_cost": 2200.0},
        {"code": "МАТ-30", "name": "Трубка полиуретановая пневматическая 10х6.5", "unit": "м", "category": "Пневматика", "standard_cost": 650.0},
        {"code": "МАТ-31", "name": "Клапан электромагнитный соленоидный 24В", "unit": "шт", "category": "КИПиА", "standard_cost": 19500.0},
        {"code": "МАТ-32", "name": "Паронит маслобензостойкий ПОН-Б 3мм", "unit": "кг", "category": "Уплотнения", "standard_cost": 2800.0},
        {"code": "МАТ-33", "name": "Шнур резиновый круглого сечения 8мм", "unit": "м", "category": "РТИ", "standard_cost": 450.0},
        {"code": "МАТ-34", "name": "Манометр глицеринозаполненный 0-250 бар", "unit": "шт", "category": "КИПиА", "standard_cost": 14000.0},
        {"code": "МАТ-35", "name": "Замок механический для стыковки ленты типа К28", "unit": "комплект", "category": "Запчасти", "standard_cost": 36000.0},
        {"code": "МАТ-36", "name": "Отрезной круг по металлу 230х2.5", "unit": "шт", "category": "Расходные", "standard_cost": 850.0},
        {"code": "МАТ-37", "name": "Перчатки спилковые комбинированные", "unit": "комплект", "category": "СИЗ", "standard_cost": 1500.0},
        {"code": "МАТ-38", "name": "Предохранитель высоковольтный ПК-6/10", "unit": "шт", "category": "Электрика", "standard_cost": 7500.0},
        {"code": "МАТ-39", "name": "Хомут силовой двухболтовый 68-73мм", "unit": "шт", "category": "Метизы", "standard_cost": 1900.0},
        {"code": "МАТ-40", "name": "Скребок очистителя ленты полиуретановый 1000мм", "unit": "шт", "category": "РТИ", "standard_cost": 48000.0}
    ]
    for m in materials_data:
        db.add(Material(**m))
    db.commit()

    # 6. Pre-seed Work Orders demonstrating all scenarios and 10 statuses!
    now = datetime.utcnow()

    # Sample Work Orders:
    # 1. EMERGENCY unaccepted order (Section 11 Demo step 2: oil leak on pump)
    wo1 = WorkOrder(
        number="НАР-2026-101",
        order_type=OrderType.EMERGENCY.value,
        priority=OrderPriority.EMERGENCY.value,
        description="Критическая утечка масла в районе торцевого уплотнения шламового насоса 1ГрТ-1600. Угроза перегрева подшипникового узла.",
        location_id=2, # Обогащение
        equipment_id=9, # Шламовый насос
        executor_id=3, # Ахметов Ерик (Слесарь, FREE)
        master_id=1,  # Ахметов Н.К.
        status=WorkOrderStatus.ISSUED.value,
        deadline=now + timedelta(minutes=45),
        standard_hours=1.5,
        created_at=now - timedelta(minutes=2)
    )
    db.add(wo1)

    # 2. IN_PROGRESS order (Section 11 step 3: accepted and being worked on)
    wo2 = WorkOrder(
        number="НАР-2026-098",
        order_type=OrderType.PLANNED.value,
        priority=OrderPriority.HIGH.value,
        description="Замена изношенных клиновых ремней привода мельницы МШР 3.6х4.0.",
        location_id=2,
        equipment_id=8,
        executor_id=4, # Байжанов Марат (BUSY)
        master_id=1,
        status=WorkOrderStatus.IN_PROGRESS.value,
        deadline=now + timedelta(minutes=90),
        standard_hours=2.0,
        created_at=now - timedelta(hours=1),
        accepted_at=now - timedelta(minutes=50),
        started_at=now - timedelta(minutes=40)
    )
    db.add(wo2)

    # 3. OVERDUE order (Section 11 step 4: Conveyor K-3 repeat issue, overdue notification)
    wo3 = WorkOrder(
        number="НАР-2026-092",
        order_type=OrderType.EMERGENCY.value,
        priority=OrderPriority.HIGH.value,
        description="Повышенный нагрев и вибрация роликоопор конвейера К-3. Проверить соосность и подшипники.",
        location_id=1, # Дробление
        equipment_id=3, # Конвейер К-3
        executor_id=6, # Сидоров Андрей (HAS_QUEUE)
        master_id=1,
        status=WorkOrderStatus.QUEUED.value,
        deadline=now - timedelta(minutes=35), # OVERDUE by 35 min!
        standard_hours=1.5,
        created_at=now - timedelta(hours=3),
        accepted_at=now - timedelta(hours=2, minutes=30)
    )
    db.add(wo3)

    # 4. EXECUTED order with approved AI Assessment (Section 11 step 5 & 6)
    wo4 = WorkOrder(
        number="НАР-2026-089",
        order_type=OrderType.PLANNED.value,
        priority=OrderPriority.NORMAL.value,
        description="Плановая протяжка болтовых соединений и замена уплотнений пресса П6330.",
        location_id=3, # РМЦ
        equipment_id=17,
        executor_id=5, # Иванов Алексей
        master_id=1,
        status=WorkOrderStatus.EXECUTED.value,
        deadline=now + timedelta(hours=2),
        standard_hours=1.5,
        actual_duration_minutes=85,
        completion_notes="Произведена протяжка высокопрочных болтов станины динамометрическим ключом с усилием 450 Нм. Заменено манжетное уплотнение штока 65х90. Протечек нет, давление в норме.",
        malfunction_code_id=10, # Г-01
        ai_verdict=AIVerdict.APPROVED.value,
        ai_score=94,
        ai_notes="ИИ-контролёр: Работы выполнены в полном соответствии с регламентом. Время 85 мин (норматив 90 мин). Фотоотчёт чёткий, следов подтёков нет, рабочая зона чистая.",
        created_at=now - timedelta(hours=4),
        accepted_at=now - timedelta(hours=3, minutes=30),
        started_at=now - timedelta(hours=3),
        executed_at=now - timedelta(hours=1, minutes=15)
    )
    db.add(wo4)

    # 5. REWORK REQUIRED order (Section 11 step 7: missing photo and excessive materials!)
    wo5 = WorkOrder(
        number="НАР-2026-085",
        order_type=OrderType.EMERGENCY.value,
        priority=OrderPriority.EMERGENCY.value,
        description="Аварийная замена скребка ленточного конвейера К-2.",
        location_id=1, # Дробление
        equipment_id=5,
        executor_id=6, # Сидоров Андрей
        master_id=1,
        status=WorkOrderStatus.REWORK.value,
        deadline=now - timedelta(hours=1),
        standard_hours=1.0,
        actual_duration_minutes=30,
        completion_notes="Скребок поменял.",
        malfunction_code_id=2, # М-02
        reject_reason=None,
        ai_verdict=AIVerdict.REWORK_REQUIRED.value,
        ai_score=45,
        ai_notes="Вердикт ИИ: ТРЕБУЕТ ДОРАБОТКИ! Отсутствует обязательное фото 'после' для аварийного наряда. Описание работ слишком краткое. Списано 60 шт. подшипников для замены скребка (аномальный расход!).",
        created_at=now - timedelta(hours=5),
        accepted_at=now - timedelta(hours=4, minutes=30),
        started_at=now - timedelta(hours=4),
        executed_at=now - timedelta(hours=3)
    )
    db.add(wo5)

    # 6. CLOSED order
    wo6 = WorkOrder(
        number="НАР-2026-080",
        order_type=OrderType.PLANNED.value,
        priority=OrderPriority.NORMAL.value,
        description="Ревизия и смазка подшипников качения питателя ПП-1-15.",
        location_id=1,
        equipment_id=7,
        executor_id=3, # Ахметов Ерик
        master_id=1,
        status=WorkOrderStatus.CLOSED.value,
        deadline=now - timedelta(hours=8),
        standard_hours=1.5,
        actual_duration_minutes=70,
        completion_notes="Проведена промывка и закладка свежей смазки Мобилгрейс XHP 222 (0.8 кг). Люфты в пределах допуска.",
        malfunction_code_id=17, # С-01
        ai_verdict=AIVerdict.APPROVED.value,
        ai_score=97,
        ai_notes="ИИ: Наряд закрыт мастером. Все требования соблюдены.",
        master_rating_override=98,
        created_at=now - timedelta(hours=10),
        accepted_at=now - timedelta(hours=9),
        started_at=now - timedelta(hours=8, minutes=45),
        executed_at=now - timedelta(hours=7, minutes=30),
        closed_at=now - timedelta(hours=7)
    )
    db.add(wo6)

    # 7. SUSPENDED order
    wo7 = WorkOrder(
        number="НАР-2026-077",
        order_type=OrderType.PLANNED.value,
        priority=OrderPriority.NORMAL.value,
        description="Замена плит дробящих конусной дробилки КМД-1750.",
        location_id=1,
        equipment_id=1,
        executor_id=7, # Кузнецов Дмитрий (BUSY/SUSPENDED)
        master_id=1,
        status=WorkOrderStatus.SUSPENDED.value,
        suspend_reason="Ожидание доставки броней со склада РМЦ и освобождения мостового крана",
        deadline=now + timedelta(hours=4),
        standard_hours=4.0,
        created_at=now - timedelta(hours=6),
        accepted_at=now - timedelta(hours=5),
        started_at=now - timedelta(hours=4, minutes=30)
    )
    db.add(wo7)

    db.commit()

    # Add Events & Materials for wo4 (Approved order)
    ev1 = WorkOrderEvent(
        work_order_id=wo4.id,
        user_id=1,
        user_name="Мастер Ахметов Н.К.",
        action="CREATED",
        timestamp=wo4.created_at,
        comment="Наряд выдан в плановом порядке"
    )
    ev2 = WorkOrderEvent(
        work_order_id=wo4.id,
        user_id=5,
        user_name="Иванов Алексей П.",
        action="STARTED",
        timestamp=wo4.started_at,
        comment="Приступил к протяжке и ревизии"
    )
    ev3 = WorkOrderEvent(
        work_order_id=wo4.id,
        user_id=5,
        user_name="Иванов Алексей П.",
        action="EXECUTED",
        timestamp=wo4.executed_at,
        comment="Работы завершены, фото приложено"
    )
    db.add_all([ev1, ev2, ev3])

    mat1 = MaterialUsage(
        work_order_id=wo4.id,
        material_id=7,
        material_name="Манжета армированная (сальник) 65х90х10",
        quantity=2.0,
        unit="шт"
    )
    mat2 = MaterialUsage(
        work_order_id=wo4.id,
        material_id=24,
        material_name="Болт высокопрочный М24х110 8.8 с гайкой",
        quantity=4.0,
        unit="комплект"
    )
    db.add_all([mat1, mat2])

    ai_ass4 = AIAssessment(
        work_order_id=wo4.id,
        verdict=AIVerdict.APPROVED.value,
        score=94,
        explanation="Работы согласованы, материалы соответствуют регламенту, фотофиксация качественная.",
        completeness_check=True,
        work_alignment_score=96,
        materials_logic_check=True,
        photo_quality_score=92,
        time_score=95,
        created_at=wo4.executed_at
    )
    db.add(ai_ass4)

    # Add materials and AI assessment for wo5 (Rework order)
    mat_bad = MaterialUsage(
        work_order_id=wo5.id,
        material_id=1,
        material_name="Подшипник роликовый 22318",
        quantity=60.0, # Excessive!
        unit="шт"
    )
    db.add(mat_bad)

    ai_ass5 = AIAssessment(
        work_order_id=wo5.id,
        verdict=AIVerdict.REWORK_REQUIRED.value,
        score=45,
        explanation="Критичные несоответствия: отсутствует фото 'после' для аварийного наряда. Списано 60 подшипников вместо скребка.",
        completeness_check=False,
        work_alignment_score=50,
        materials_logic_check=False,
        photo_quality_score=20,
        time_score=80,
        created_at=wo5.executed_at
    )
    db.add(ai_ass5)

    db.commit()
