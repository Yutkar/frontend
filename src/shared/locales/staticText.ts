import type { SmartQLanguage } from './types'

type StaticTextTranslation = {
  en: string
  kk: string
}

const staticTextTranslations: Record<string, StaticTextTranslation> = {
  'Администрирование': { kk: 'Әкімшілік', en: 'Administration' },
  'Активен': { kk: 'Белсенді', en: 'Active' },
  'Активна': { kk: 'Белсенді', en: 'Active' },
  'Аналитика': { kk: 'Талдау', en: 'Analytics' },
  'Артқа': { kk: 'Артқа', en: 'Back' },
  'Басқару панелі': { kk: 'Басқару панелі', en: 'Dashboard' },
  'В очереди нет талонов': { kk: 'Кезекте талондар жоқ', en: 'No tickets in queue' },
  'В обслуживании': { kk: 'Қызмет көрсетілуде', en: 'In service' },
  'В работе': { kk: 'Жұмыста', en: 'In progress' },
  'Время': { kk: 'Уақыт', en: 'Time' },
  'Время вызова': { kk: 'Шақыру уақыты', en: 'Call time' },
  'Все места обслуживания': { kk: 'Барлық қызмет көрсету орындары', en: 'All service places' },
  'Все приоритеты': { kk: 'Барлық басымдықтар', en: 'All priorities' },
  'Все специалисты': { kk: 'Барлық мамандар', en: 'All specialists' },
  'Все статусы': { kk: 'Барлық статустар', en: 'All statuses' },
  'Все услуги': { kk: 'Барлық қызметтер', en: 'All services' },
  'Вызван': { kk: 'Шақырылды', en: 'Called' },
  'Вызвать': { kk: 'Шақыру', en: 'Call' },
  'Вызвать вне очереди': { kk: 'Кезектен тыс шақыру', en: 'Call out of turn' },
  'Выберите корректный период': { kk: 'Дұрыс кезеңді таңдаңыз', en: 'Choose a valid period' },
  'Выберите услугу': { kk: 'Қызметті таңдаңыз', en: 'Choose a service' },
  'Выдача остановлена': { kk: 'Талон беру тоқтатылды', en: 'Ticket issue stopped' },
  'Высокий': { kk: 'Жоғары', en: 'High' },
  'Готово': { kk: 'Дайын', en: 'Ready' },
  'График': { kk: 'Кесте', en: 'Schedule' },
  'Дата': { kk: 'Күні', en: 'Date' },
  'Дата до': { kk: 'Аяқталу күні', en: 'Date to' },
  'Дата от': { kk: 'Басталу күні', en: 'Date from' },
  'Действие': { kk: 'Әрекет', en: 'Action' },
  'Действия': { kk: 'Әрекеттер', en: 'Actions' },
  'Дерек жоқ': { kk: 'Дерек жоқ', en: 'No data' },
  'Добавить': { kk: 'Қосу', en: 'Add' },
  'Добавить место': { kk: 'Орын қосу', en: 'Add place' },
  'Добавить тип услуги': { kk: 'Қызмет түрін қосу', en: 'Add service type' },
  'Добавить экран': { kk: 'Экран қосу', en: 'Add screen' },
  'Завершить обслуживание': { kk: 'Қызмет көрсетуді аяқтау', en: 'Complete service' },
  'Завершён': { kk: 'Аяқталды', en: 'Completed' },
  'Завершены': { kk: 'Аяқталды', en: 'Completed' },
  'Загрузка': { kk: 'Жүктелуде', en: 'Loading' },
  'Загрузка данных...': { kk: 'Деректер жүктелуде...', en: 'Loading data...' },
  'Загрузка аналитики...': { kk: 'Талдау жүктелуде...', en: 'Loading analytics...' },
  'Загружаем кабинеты': { kk: 'Кабинеттер жүктелуде', en: 'Loading rooms' },
  'Загружаем типы услуг': { kk: 'Қызмет түрлері жүктелуде', en: 'Loading service types' },
  'Закрываем выдачу...': { kk: 'Талон беру жабылуда...', en: 'Closing ticket issue...' },
  'Закрыть': { kk: 'Жабу', en: 'Close' },
  'Закрыть все': { kk: 'Барлығын жабу', en: 'Close all' },
  'Закрыть выдачу талонов': { kk: 'Талон беруді жабу', en: 'Close ticket issue' },
  'Кабинет': { kk: 'Кабинет', en: 'Room' },
  'Кабинет специалиста не назначен': { kk: 'Маман кабинеті тағайындалмаған', en: 'Specialist room is not assigned' },
  'Кабинет специалиста неактивен': { kk: 'Маман кабинеті белсенді емес', en: 'Specialist room is inactive' },
  'Кабинеты': { kk: 'Кабинеттер', en: 'Rooms' },
  'Киоск': { kk: 'Киоск', en: 'Kiosk' },
  'Киоски': { kk: 'Киоскілер', en: 'Kiosks' },
  'Клиент': { kk: 'Клиент', en: 'Client' },
  'Количество талонов': { kk: 'Талондар саны', en: 'Ticket count' },
  'Критический': { kk: 'Шұғыл', en: 'Critical' },
  'Лист ожидания': { kk: 'Күту тізімі', en: 'Waiting list' },
  'Место обслуживания': { kk: 'Қызмет көрсету орны', en: 'Service place' },
  'Место обслуживания выбрано автоматически': { kk: 'Қызмет көрсету орны автоматты түрде таңдалды', en: 'Service place selected automatically' },
  'Менеджеры': { kk: 'Менеджерлер', en: 'Managers' },
  'На обслуживании': { kk: 'Қызмет көрсетілуде', en: 'In service' },
  'Назад': { kk: 'Артқа', en: 'Back' },
  'Название услуги': { kk: 'Қызмет атауы', en: 'Service name' },
  'Начать обслуживание': { kk: 'Қызмет көрсетуді бастау', en: 'Start service' },
  'Не активен': { kk: 'Белсенді емес', en: 'Inactive' },
  'Не удалось загрузить данные': { kk: 'Деректерді жүктеу мүмкін болмады', en: 'Could not load data' },
  'Не удалось загрузить аналитику': { kk: 'Талдауды жүктеу мүмкін болмады', en: 'Could not load analytics' },
  'Не удалось создать талон.': { kk: 'Талон жасау мүмкін болмады.', en: 'Could not create ticket.' },
  'Не явился': { kk: 'Келмеді', en: 'No-show' },
  'Не явились': { kk: 'Келмеді', en: 'No-shows' },
  'Неактивна': { kk: 'Белсенді емес', en: 'Inactive' },
  'Нет активного пациента': { kk: 'Белсенді пациент жоқ', en: 'No active patient' },
  'Нет данных': { kk: 'Дерек жоқ', en: 'No data' },
  'Нет посещений за сегодня.': { kk: 'Бүгін кірулер жоқ.', en: 'No visits today.' },
  'Нет рекомендаций': { kk: 'Ұсынымдар жоқ', en: 'No recommendations' },
  'Низкий': { kk: 'Төмен', en: 'Low' },
  'Новые талоны появятся здесь.': { kk: 'Жаңа талондар осында пайда болады.', en: 'New tickets will appear here.' },
  'Номер': { kk: 'Нөмір', en: 'Number' },
  'Номер кабинета': { kk: 'Кабинет нөмірі', en: 'Room number' },
  'Номер талона': { kk: 'Талон нөмірі', en: 'Ticket number' },
  'Обычный': { kk: 'Қалыпты', en: 'Normal' },
  'Ожидание': { kk: 'Күтуде', en: 'Waiting' },
  'Ожидают': { kk: 'Күтуде', en: 'Waiting' },
  'Ожидайте вызова': { kk: 'Шақыруды күтіңіз', en: 'Please wait for your call' },
  'Окно': { kk: 'Терезе', en: 'Window' },
  'Отмена': { kk: 'Бас тарту', en: 'Cancel' },
  'Отменить': { kk: 'Бас тарту', en: 'Cancel' },
  'Отменён': { kk: 'Бас тартылды', en: 'Cancelled' },
  'Очередь': { kk: 'Кезек', en: 'Queue' },
  'Очередь займёт': { kk: 'Кезек алады', en: 'Queue will take' },
  'Очередь займёт примерно': { kk: 'Кезек шамамен алады', en: 'Queue will take about' },
  'Пациент': { kk: 'Пациент', en: 'Patient' },
  'Пациент не назначен': { kk: 'Пациент тағайындалмаған', en: 'Patient is not assigned' },
  'Пациентов в очереди': { kk: 'Кезектегі пациенттер', en: 'Patients in queue' },
  'Панель специалиста': { kk: 'Маман панелі', en: 'Specialist panel' },
  'Панель управления': { kk: 'Басқару панелі', en: 'Dashboard' },
  'Перед вами': { kk: 'Сіздің алдыңызда', en: 'Ahead of you' },
  'Перенаправить': { kk: 'Бағыттау', en: 'Redirect' },
  'Перенаправить пациента': { kk: 'Пациентті бағыттау', en: 'Redirect patient' },
  'Перенаправление': { kk: 'Бағыттау', en: 'Redirect' },
  'Перенаправлен': { kk: 'Бағытталды', en: 'Redirected' },
  'Персонал': { kk: 'Персонал', en: 'Staff' },
  'Печать талона': { kk: 'Талонды басып шығару', en: 'Print ticket' },
  'По выбранным фильтрам данных нет.': { kk: 'Таңдалған сүзгілер бойынша дерек жоқ.', en: 'No data for selected filters.' },
  'Приоритет': { kk: 'Басымдық', en: 'Priority' },
  'Рабочее время': { kk: 'Жұмыс уақыты', en: 'Working hours' },
  'Редактировать': { kk: 'Өңдеу', en: 'Edit' },
  'Редактировать тип услуги': { kk: 'Қызмет түрін өңдеу', en: 'Edit service type' },
  'Рекомендаций нет': { kk: 'Ұсынымдар жоқ', en: 'No recommendations' },
  'Сбросить фильтры': { kk: 'Сүзгілерді тазалау', en: 'Reset filters' },
  'Сводка очереди': { kk: 'Кезек қорытындысы', en: 'Queue summary' },
  'Сейчас вызывается': { kk: 'Қазір шақырылады', en: 'Now calling' },
  'Сейчас не работает': { kk: 'Қазір жұмыс істемейді', en: 'Currently closed' },
  'Сигналдар журналы': { kk: 'Сигналдар журналы', en: 'Signal log' },
  'Сохранить': { kk: 'Сақтау', en: 'Save' },
  'Сохраняем...': { kk: 'Сақталуда...', en: 'Saving...' },
  'Специалист': { kk: 'Маман', en: 'Specialist' },
  'Специальность': { kk: 'Мамандығы', en: 'Specialty' },
  'Среднее обслуживание': { kk: 'Орташа қызмет көрсету', en: 'Average service' },
  'Среднее ожидание': { kk: 'Орташа күту', en: 'Average waiting' },
  'Статистика места обслуживания': { kk: 'Қызмет көрсету орнының статистикасы', en: 'Service place statistics' },
  'Статус': { kk: 'Статус', en: 'Status' },
  'Стол': { kk: 'Үстел', en: 'Desk' },
  'Табло': { kk: 'Табло', en: 'Board' },
  'Табло вызова пациентов': { kk: 'Пациенттерді шақыру таблосы', en: 'Patient call board' },
  'Талон': { kk: 'Талон', en: 'Ticket' },
  'Талон создан': { kk: 'Талон жасалды', en: 'Ticket created' },
  'Талоны': { kk: 'Талондар', en: 'Tickets' },
  'Текущая очередь': { kk: 'Ағымдағы кезек', en: 'Current queue' },
  'Текущий специалист': { kk: 'Ағымдағы маман', en: 'Current specialist' },
  'Тип места': { kk: 'Орын түрі', en: 'Place type' },
  'Тип услуги': { kk: 'Қызмет түрі', en: 'Service type' },
  'Типы услуг': { kk: 'Қызмет түрлері', en: 'Service types' },
  'Удалить': { kk: 'Жою', en: 'Delete' },
  'Услуга': { kk: 'Қызмет', en: 'Service' },
  'Услуги': { kk: 'Қызметтер', en: 'Services' },
  'ФИО': { kk: 'Аты-жөні', en: 'Full name' },
  'ФИО пациента': { kk: 'Пациенттің аты-жөні', en: 'Patient full name' },
  'Фильтры': { kk: 'Сүзгілер', en: 'Filters' },
  'Экраны табло': { kk: 'Табло экрандары', en: 'Board screens' },
  'Всего талонов': { kk: 'Барлық талондар', en: 'Total tickets' },
  'Все талоны в текущей очереди': { kk: 'Ағымдағы кезектегі барлық талондар', en: 'All tickets in the current queue' },
  'Ожидают вызова': { kk: 'Шақыруды күтуде', en: 'Waiting for call' },
  'Пациенты уже вызваны': { kk: 'Пациенттер шақырылды', en: 'Patients already called' },
  'Сейчас на приёме': { kk: 'Қазір қабылдауда', en: 'Currently in service' },
  'Обслуживаются': { kk: 'Қызмет көрсетілуде', en: 'In service' },
  'Обслуживание завершено': { kk: 'Қызмет көрсету аяқталды', en: 'Service completed' },
  'Система не видит перегрузки или критичных предупреждений.': { kk: 'Жүйе артық жүктемені немесе маңызды ескертулерді көріп тұрған жоқ.', en: 'The system does not see overloads or critical warnings.' },
  'Уведомления': { kk: 'Хабарламалар', en: 'Notifications' },
  'Новых уведомлений нет': { kk: 'Жаңа хабарламалар жоқ', en: 'No new notifications' },
  'Открыть уведомления': { kk: 'Хабарламаларды ашу', en: 'Open notifications' },
  'Закрыть уведомление': { kk: 'Хабарламаны жабу', en: 'Close notification' },
  'Вы точно хотите закрыть все уведомления?': { kk: 'Барлық хабарламаларды жабуға сенімдісіз бе?', en: 'Are you sure you want to close all notifications?' },
  'Да, закрыть': { kk: 'Иә, жабу', en: 'Yes, close' },
  'Открыть талон': { kk: 'Талонды ашу', en: 'Open ticket' },
  'Открыть кабинет': { kk: 'Кабинетті ашу', en: 'Open room' },
  'Выйти': { kk: 'Шығу', en: 'Sign out' },
  'Выйти из системы': { kk: 'Жүйеден шығу', en: 'Sign out' },
  'Тестовые учётные записи': { kk: 'Тест есептік жазбалары', en: 'Test accounts' },
  'Комментарий': { kk: 'Пікір', en: 'Comment' },
  'Врач': { kk: 'Дәрігер', en: 'Doctor' },
  'Фактическое ожидание': { kk: 'Нақты күту', en: 'Actual waiting' },
  'Плановое ожидание, мин': { kk: 'Жоспарлы күту, мин', en: 'Planned waiting, min' },
  'Нет доступных мест обслуживания для выбранной услуги': { kk: 'Таңдалған қызмет үшін қолжетімді орындар жоқ', en: 'No service places available for the selected service' },
  'Не удалось сохранить настройки талона.': { kk: 'Талон баптауларын сақтау мүмкін болмады.', en: 'Could not save ticket settings.' },
  'Среднее время, мин': { kk: 'Орташа уақыт, мин', en: 'Average time, min' },
  'Период': { kk: 'Кезең', en: 'Period' },
  'Обслуживание': { kk: 'Қызмет көрсету', en: 'Service' },
  'Столбцы показывают, сколько талонов ожидали и сколько было завершено в каждом периоде.': { kk: 'Бағандар әр кезеңде қанша талон күткенін және қаншасы аяқталғанын көрсетеді.', en: 'Bars show how many tickets waited and were completed in each period.' },
  'Активных кабинетов': { kk: 'Белсенді кабинеттер', en: 'Active rooms' },
  'Активные места обслуживания не найдены': { kk: 'Белсенді қызмет көрсету орындары табылмады', en: 'No active service places found' },
  'Активных уведомлений нет': { kk: 'Белсенді хабарламалар жоқ', en: 'No active notifications' },
  'Аналитика использует те же контрактные данные, что и будущий API.': { kk: 'Талдау болашақ API қолданатын келісімшарт деректерін пайдаланады.', en: 'Analytics uses the same contract data as the future API.' },
  'Будущие вызовы пациентов': { kk: 'Пациенттердің болашақ шақырулары', en: 'Upcoming patient calls' },
  'Весь день': { kk: 'Күні бойы', en: 'All day' },
  'Врачи не найдены': { kk: 'Дәрігерлер табылмады', en: 'No doctors found' },
  'Врачей': { kk: 'Дәрігерлер', en: 'Doctors' },
  'Выдача отключена': { kk: 'Талон беру өшірілген', en: 'Ticket issue disabled' },
  'Выберите тип услуги.': { kk: 'Қызмет түрін таңдаңыз.', en: 'Choose a service type.' },
  'Данных для аналитики пока нет': { kk: 'Талдау үшін әзірге дерек жоқ', en: 'No analytics data yet' },
  'Данные успешно обновлены': { kk: 'Деректер сәтті жаңартылды', en: 'Data updated successfully' },
  'Добавить врача': { kk: 'Дәрігер қосу', en: 'Add doctor' },
  'Добавить киоск': { kk: 'Киоск қосу', en: 'Add kiosk' },
  'Добавить менеджера': { kk: 'Менеджер қосу', en: 'Add manager' },
  'Добавить терминал': { kk: 'Терминал қосу', en: 'Add terminal' },
  'Добавьте врача и назначьте ему кабинет.': { kk: 'Дәрігер қосып, оған кабинет тағайындаңыз.', en: 'Add a doctor and assign a room.' },
  'Добавьте менеджера для работы с очередями.': { kk: 'Кезектермен жұмыс істеу үшін менеджер қосыңыз.', en: 'Add a manager to work with queues.' },
  'Добавьте первый терминал и выберите для него услуги.': { kk: 'Бірінші терминалды қосып, оған қызметтер таңдаңыз.', en: 'Add the first terminal and choose services for it.' },
  'Закрыт': { kk: 'Жабық', en: 'Closed' },
  'Загружаем киоски': { kk: 'Киоскілер жүктелуде', en: 'Loading kiosks' },
  'Загружаем менеджеров': { kk: 'Менеджерлер жүктелуде', en: 'Loading managers' },
  'Загружаем настройки очередей': { kk: 'Кезек баптаулары жүктелуде', en: 'Loading queue settings' },
  'Загружаем персонал': { kk: 'Персонал жүктелуде', en: 'Loading staff' },
  'Имя': { kk: 'Аты', en: 'Name' },
  'Индивидуальное табло': { kk: 'Жеке табло', en: 'Individual board' },
  'Кабинет специалиста': { kk: 'Маман кабинеті', en: 'Specialist room' },
  'Кабинеты не выбраны': { kk: 'Кабинеттер таңдалмаған', en: 'No rooms selected' },
  'Кабинеты не найдены': { kk: 'Кабинеттер табылмады', en: 'No rooms found' },
  'Контракт аналитики': { kk: 'Талдау келісімшарты', en: 'Analytics contract' },
  'Критично': { kk: 'Маңызды', en: 'Critical' },
  'Логин': { kk: 'Логин', en: 'Login' },
  'Маршрутизация': { kk: 'Маршруттау', en: 'Routing' },
  'Менеджер': { kk: 'Менеджер', en: 'Manager' },
  'Менеджеры не найдены': { kk: 'Менеджерлер табылмады', en: 'No managers found' },
  'Места обслуживания': { kk: 'Қызмет көрсету орындары', en: 'Service places' },
  'Место установки': { kk: 'Орнату орны', en: 'Installation place' },
  'Настройка кабинетов, персонала и доступов': { kk: 'Кабинеттерді, персоналды және қолжетімділікті баптау', en: 'Configure rooms, staff and access' },
  'Настройка очереди сохранена': { kk: 'Кезек баптауы сақталды', en: 'Queue setting saved' },
  'Настройте доступные услуги и места обслуживания для каждого терминала.': { kk: 'Әр терминал үшін қолжетімді қызметтер мен орындарды баптаңыз.', en: 'Configure available services and places for each terminal.' },
  'Настройки очередей': { kk: 'Кезек баптаулары', en: 'Queue settings' },
  'Не выбраны': { kk: 'Таңдалмаған', en: 'Not selected' },
  'Не удалось загрузить киоски': { kk: 'Киоскілерді жүктеу мүмкін болмады', en: 'Could not load kiosks' },
  'Не удалось загрузить персонал': { kk: 'Персоналды жүктеу мүмкін болмады', en: 'Could not load staff' },
  'Не удалось загрузить типы услуг для фильтра.': { kk: 'Сүзгі үшін қызмет түрлерін жүктеу мүмкін болмады.', en: 'Could not load service types for the filter.' },
  'Не удалось сохранить терминал': { kk: 'Терминалды сақтау мүмкін болмады', en: 'Could not save terminal' },
  'Не выбрана услуга': { kk: 'Қызмет таңдалмаған', en: 'No service selected' },
  'Новая услуга': { kk: 'Жаңа қызмет', en: 'New service' },
  'Новые рекомендации появятся здесь после обновления очереди.': { kk: 'Кезек жаңартылғаннан кейін жаңа ұсынымдар осында пайда болады.', en: 'New recommendations will appear here after queue refresh.' },
  'Обзор состояния системы через контракт сервисного слоя.': { kk: 'Сервис қабаты келісімшарты арқылы жүйе күйіне шолу.', en: 'System status overview through the service layer contract.' },
  'Общее табло': { kk: 'Жалпы табло', en: 'General board' },
  'Оставьте пустым без изменений': { kk: 'Өзгеріссіз қалдыру үшін бос қалдырыңыз', en: 'Leave empty to keep unchanged' },
  'Отправляем...': { kk: 'Жіберілуде...', en: 'Sending...' },
  'Пароль': { kk: 'Құпия сөз', en: 'Password' },
  'Пациенты не подошли к вызову': { kk: 'Пациенттер шақыруға келмеді', en: 'Patients did not come to the call' },
  'Проверьте подключение к серверу.': { kk: 'Серверге қосылымды тексеріңіз.', en: 'Check the server connection.' },
  'Проверьте подключение к backend и попробуйте обновить страницу.': { kk: 'Backend қосылымын тексеріп, бетті жаңартып көріңіз.', en: 'Check backend connection and try refreshing the page.' },
  'Получаем актуальные талоны, кабинеты и рекомендации.': { kk: 'Өзекті талондар, кабинеттер және ұсынымдар алынуда.', en: 'Loading current tickets, rooms and recommendations.' },
  'Получаем данные из backend.': { kk: 'Деректер backend-тен алынуда.', en: 'Loading data from backend.' },
  'Реестр талонов': { kk: 'Талондар тізілімі', en: 'Ticket registry' },
  'Редактировать врача': { kk: 'Дәрігерді өңдеу', en: 'Edit doctor' },
  'Редактировать киоск': { kk: 'Киоскіні өңдеу', en: 'Edit kiosk' },
  'Редактировать менеджера': { kk: 'Менеджерді өңдеу', en: 'Edit manager' },
  'С учётом выбранных фильтров': { kk: 'Таңдалған сүзгілерді ескере отырып', en: 'With selected filters' },
  'Свяжите одну услугу с несколькими кабинетами. При выдаче талона система выберет доступный кабинет с меньшей очередью.': { kk: 'Бір қызметті бірнеше кабинетпен байланыстырыңыз. Талон бергенде жүйе кезегі аз қолжетімді кабинетті таңдайды.', en: 'Link one service to several rooms. When issuing a ticket, the system will choose an available room with a smaller queue.' },
  'Ссылка на киоск': { kk: 'Киоск сілтемесі', en: 'Kiosk link' },
  'Ссылка на киоск:': { kk: 'Киоск сілтемесі:', en: 'Kiosk link:' },
  'Создайте или обработайте талоны, чтобы увидеть статистику.': { kk: 'Статистиканы көру үшін талон жасаңыз немесе өңдеңіз.', en: 'Create or process tickets to see statistics.' },
  'Создание врачей и назначение кабинетов.': { kk: 'Дәрігерлер жасау және кабинеттер тағайындау.', en: 'Create doctors and assign rooms.' },
  'Создание, редактирование и деактивация мест обслуживания учреждения.': { kk: 'Ұйымның қызмет көрсету орындарын жасау, өңдеу және өшіру.', en: 'Create, edit and deactivate service places.' },
  'Сохранить настройку': { kk: 'Баптауды сақтау', en: 'Save setting' },
  'Среднее время': { kk: 'Орташа уақыт', en: 'Average time' },
  'Терминал': { kk: 'Терминал', en: 'Terminal' },
  'Терминал сохранён': { kk: 'Терминал сақталды', en: 'Terminal saved' },
  'Терминалы': { kk: 'Терминалдар', en: 'Terminals' },
  'Текущая связка': { kk: 'Ағымдағы байланыс', en: 'Current link' },
  'Типы услуг не найдены': { kk: 'Қызмет түрлері табылмады', en: 'No service types found' },
  'Управление': { kk: 'Басқару', en: 'Management' },
  'Управление аккаунтами менеджеров.': { kk: 'Менеджер аккаунттарын басқару.', en: 'Manage manager accounts.' },
  'Услуга не выбрана': { kk: 'Қызмет таңдалмаған', en: 'No service selected' },
  'Услуги не найдены': { kk: 'Қызметтер табылмады', en: 'No services found' },
  'Холл / 1 этаж': { kk: 'Холл / 1 қабат', en: 'Hall / 1st floor' },
  'Информация': { kk: 'Ақпарат', en: 'Information' },
  'Внимание': { kk: 'Назар аударыңыз', en: 'Warning' },
}

function preserveWhitespace(source: string, translation: string): string {
  const prefix = source.match(/^\s*/)?.[0] ?? ''
  const suffix = source.match(/\s*$/)?.[0] ?? ''

  return `${prefix}${translation}${suffix}`
}

function translatePriority(value: string, language: SmartQLanguage): string {
  if (language === 'ru') {
    return value
  }

  const priorityTranslations: Record<string, StaticTextTranslation> = {
    высокий: { kk: 'жоғары', en: 'high' },
    критический: { kk: 'шұғыл', en: 'critical' },
    низкий: { kk: 'төмен', en: 'low' },
    обычный: { kk: 'қалыпты', en: 'normal' },
  }

  return priorityTranslations[value.toLowerCase()]?.[language] ?? value
}

function translateTimePhrase(value: string, language: SmartQLanguage): string | null {
  if (value === 'сейчас') {
    return language === 'kk' ? 'қазір' : 'now'
  }

  if (value === 'меньше минуты') {
    return language === 'kk' ? 'бір минуттан аз' : 'less than a minute'
  }

  const minutesMatch = value.match(/^(\d+)\s+мин$/)

  if (minutesMatch) {
    return language === 'kk' ? `${minutesMatch[1]} мин` : `${minutesMatch[1]} min`
  }

  const hoursMinutesMatch = value.match(/^(\d+)\s+ч(?:\s+(\d+)\s+мин)?$/)

  if (hoursMinutesMatch) {
    const hours = language === 'kk' ? `${hoursMinutesMatch[1]} сағ` : `${hoursMinutesMatch[1]} h`
    const minutes = hoursMinutesMatch[2]
      ? language === 'kk' ? ` ${hoursMinutesMatch[2]} мин` : ` ${hoursMinutesMatch[2]} min`
      : ''

    return `${hours}${minutes}`
  }

  return null
}

function translatePatternText(value: string, language: SmartQLanguage): string | null {
  const newNotificationsMatch = value.match(/^(\d+)\s+новых$/)

  if (newNotificationsMatch) {
    return language === 'kk'
      ? `${newNotificationsMatch[1]} жаңа`
      : `${newNotificationsMatch[1]} new`
  }

  const ticketWaitingMatch = value.match(/^Талон\s+(.+?)\s+—\s+(.+?)\s+приоритет,\s+ожидает\s+(.+)$/)

  if (ticketWaitingMatch) {
    const [, ticketNumber, priority, waitingTime] = ticketWaitingMatch
    const translatedPriority = translatePriority(priority, language)
    const translatedWaitingTime = translateTimePhrase(waitingTime, language) ?? waitingTime

    return language === 'kk'
      ? `${ticketNumber} талоны — ${translatedPriority} басымдық, ${translatedWaitingTime} күтуде`
      : `Ticket ${ticketNumber} — ${translatedPriority} priority, waiting ${translatedWaitingTime}`
  }

  const editTicketMatch = value.match(/^Редактировать талон\s+(.+)$/)

  if (editTicketMatch) {
    return language === 'kk'
      ? `${editTicketMatch[1]} талонын өңдеу`
      : `Edit ticket ${editTicketMatch[1]}`
  }

  const closedRoomMatch = value.match(/^(.+?)\s+—\s+закрыт$/)

  if (closedRoomMatch) {
    return language === 'kk'
      ? `${closedRoomMatch[1]} — жабық`
      : `${closedRoomMatch[1]} — closed`
  }

  return translateTimePhrase(value, language)
}

export function translateStaticText(value: string, language: SmartQLanguage): string {
  if (language === 'ru') {
    return value
  }

  const trimmedValue = value.trim()
  const translation = staticTextTranslations[trimmedValue]?.[language]
    ?? translatePatternText(trimmedValue, language)

  if (!translation) {
    return value
  }

  return preserveWhitespace(value, translation)
}

export function hasStaticTextTranslation(value: string, language: SmartQLanguage): boolean {
  return language !== 'ru' && Boolean(staticTextTranslations[value.trim()]?.[language])
}
