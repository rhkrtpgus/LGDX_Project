package com.example.demo.service;

import com.example.demo.domain.AlertLogRecord;
import com.example.demo.domain.ChildProfile;
import com.example.demo.domain.ChildYoutubeCategoryFilterRecord;
import com.example.demo.domain.ChildWatchPolicyRecord;
import com.example.demo.domain.ViewingHistoryWriteRecord;
import com.example.demo.dto.ChildWatchPolicyRequest;
import com.example.demo.dto.ChildWatchPolicyResponse;
import com.example.demo.dto.ChildCreateRequest;
import com.example.demo.dto.MobileReportResponse;
import com.example.demo.dto.ParentAlertResponse;
import com.example.demo.dto.ParentChildResponse;
import com.example.demo.dto.ParentOverviewResponse;
import com.example.demo.dto.ParentViewingHistoryResponse;
import com.example.demo.dto.PlaybackDecisionResult;
import com.example.demo.dto.PlaybackRecordRequest;
import com.example.demo.dto.PlaybackRecordResponse;
import com.example.demo.dto.YoutubeCategoryFilterRequest;
import com.example.demo.dto.YoutubeCategoryFilterResponse;
import com.example.demo.repository.ParentControlMapper;
import java.time.DayOfWeek;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

@Service
public class ParentControlService {

	private static final Map<String, Boolean> DEFAULT_YOUTUBE_CATEGORY_SETTINGS = createDefaultYoutubeCategorySettings();

	private final ParentControlMapper parentControlMapper;
	private final MobileReportService mobileReportService;

	public ParentControlService(
		ParentControlMapper parentControlMapper,
		MobileReportService mobileReportService
	) {
		this.parentControlMapper = parentControlMapper;
		this.mobileReportService = mobileReportService;
	}

	public ParentOverviewResponse getOverview(int familyId) {
		String familyName = parentControlMapper.findFamilyNameById(familyId);
		if (!StringUtils.hasText(familyName)) {
			throw new IllegalArgumentException("가족 정보를 찾을 수 없습니다.");
		}

		List<ParentChildResponse> children = parentControlMapper.findChildrenByFamilyId(familyId)
			.stream()
			.map(this::toChildResponse)
			.toList();
		MobileReportResponse report = mobileReportService.getMobileReport(familyId);

		return new ParentOverviewResponse(
			familyId,
			familyName,
			parentControlMapper.countTodayViewingsByFamilyId(familyId),
			parentControlMapper.countAlertsByFamilyId(familyId),
			children,
			report,
			parentControlMapper.findAlertsByFamilyId(familyId, 5)
		);
	}

	public List<ParentChildResponse> getChildren(int familyId) {
		return parentControlMapper.findChildrenByFamilyId(familyId).stream()
			.map(this::toChildResponse)
			.toList();
	}

	public ParentChildResponse createChild(ChildCreateRequest request) {
		if (request.familyId() == null) {
			throw new IllegalArgumentException("familyId는 필수입니다.");
		}
		if (!StringUtils.hasText(request.childName())) {
			throw new IllegalArgumentException("childName은 필수입니다.");
		}
		if (request.birthYear() == null || request.birthYear() < 2000 || request.birthYear() > LocalDateTime.now().getYear()) {
			throw new IllegalArgumentException("birthYear 값이 올바르지 않습니다.");
		}

		String familyName = parentControlMapper.findFamilyNameById(request.familyId());
		if (!StringUtils.hasText(familyName)) {
			throw new IllegalArgumentException("가족 정보를 찾을 수 없습니다.");
		}

		int childId = defaultInt(parentControlMapper.nextChildId());
		parentControlMapper.insertChild(
			childId,
			request.familyId(),
			request.childName().trim(),
			request.birthYear()
		);

		ChildWatchPolicyRecord policy = resolvePolicy(childId);
		if (request.dailyLimitMinutes() != null && request.dailyLimitMinutes() > 0) {
			policy.setDailyLimitMinutes(request.dailyLimitMinutes());
			policy.setMondayLimitMinutes(request.dailyLimitMinutes());
			policy.setTuesdayLimitMinutes(request.dailyLimitMinutes());
			policy.setWednesdayLimitMinutes(request.dailyLimitMinutes());
			policy.setThursdayLimitMinutes(request.dailyLimitMinutes());
			policy.setFridayLimitMinutes(request.dailyLimitMinutes());
			policy.setSaturdayLimitMinutes(Math.min(request.dailyLimitMinutes() + 20, 240));
			policy.setSundayLimitMinutes(Math.min(request.dailyLimitMinutes() + 20, 240));
			validatePolicy(policy);
			parentControlMapper.upsertWatchPolicy(policy);
		}

		resolveYoutubeCategoryFilters(childId);
		return toChildResponse(getRequiredChild(childId));
	}

	public ChildProfile getChildProfile(int childId) {
		return parentControlMapper.findChildById(childId);
	}

	public ChildWatchPolicyResponse getWatchPolicy(int childId) {
		ChildProfile child = getRequiredChild(childId);
		return toPolicyResponse(resolvePolicy(child.childId()));
	}

	public ChildWatchPolicyResponse updateWatchPolicy(ChildWatchPolicyRequest request) {
		if (request.childId() == null) {
			throw new IllegalArgumentException("childId는 필수입니다.");
		}

		ChildProfile child = getRequiredChild(request.childId());
		ChildWatchPolicyRecord current = resolvePolicy(child.childId());

		ChildWatchPolicyRecord next = new ChildWatchPolicyRecord();
		next.setChildId(child.childId());
		next.setDailyLimitMinutes(
			request.dailyLimitMinutes() != null ? request.dailyLimitMinutes() : current.getDailyLimitMinutes()
		);
		next.setWeekdayStartHour(
			request.weekdayStartHour() != null ? request.weekdayStartHour() : current.getWeekdayStartHour()
		);
		next.setWeekdayEndHour(
			request.weekdayEndHour() != null ? request.weekdayEndHour() : current.getWeekdayEndHour()
		);
		next.setWeekendStartHour(
			request.weekendStartHour() != null ? request.weekendStartHour() : current.getWeekendStartHour()
		);
		next.setWeekendEndHour(
			request.weekendEndHour() != null ? request.weekendEndHour() : current.getWeekendEndHour()
		);
		next.setBedtimeLockEnabled(
			request.bedtimeLockEnabled() != null ? request.bedtimeLockEnabled() : current.getBedtimeLockEnabled()
		);
		next.setBedtimeHour(
			request.bedtimeHour() != null ? request.bedtimeHour() : current.getBedtimeHour()
		);
		next.setMondayLimitMinutes(
			request.mondayLimitMinutes() != null ? request.mondayLimitMinutes() : current.getMondayLimitMinutes()
		);
		next.setTuesdayLimitMinutes(
			request.tuesdayLimitMinutes() != null ? request.tuesdayLimitMinutes() : current.getTuesdayLimitMinutes()
		);
		next.setWednesdayLimitMinutes(
			request.wednesdayLimitMinutes() != null ? request.wednesdayLimitMinutes() : current.getWednesdayLimitMinutes()
		);
		next.setThursdayLimitMinutes(
			request.thursdayLimitMinutes() != null ? request.thursdayLimitMinutes() : current.getThursdayLimitMinutes()
		);
		next.setFridayLimitMinutes(
			request.fridayLimitMinutes() != null ? request.fridayLimitMinutes() : current.getFridayLimitMinutes()
		);
		next.setSaturdayLimitMinutes(
			request.saturdayLimitMinutes() != null ? request.saturdayLimitMinutes() : current.getSaturdayLimitMinutes()
		);
		next.setSundayLimitMinutes(
			request.sundayLimitMinutes() != null ? request.sundayLimitMinutes() : current.getSundayLimitMinutes()
		);
		next.setNotificationThreshold(
			request.notificationThreshold() != null
				? request.notificationThreshold()
				: current.getNotificationThreshold()
		);
		next.setAutoBlockEnabled(
			request.autoBlockEnabled() != null ? request.autoBlockEnabled() : current.getAutoBlockEnabled()
		);

		validatePolicy(next);
		parentControlMapper.upsertWatchPolicy(next);
		return getWatchPolicy(child.childId());
	}

	public YoutubeCategoryFilterResponse getYoutubeCategoryFilter(int childId) {
		ChildProfile child = getRequiredChild(childId);
		return toYoutubeCategoryFilterResponse(child.childId(), resolveYoutubeCategoryFilters(child.childId()));
	}

	public YoutubeCategoryFilterResponse updateYoutubeCategoryFilter(YoutubeCategoryFilterRequest request) {
		if (request.childId() == null) {
			throw new IllegalArgumentException("childId는 필수입니다.");
		}
		if (!StringUtils.hasText(request.categoryId())) {
			throw new IllegalArgumentException("categoryId는 필수입니다.");
		}
		if (request.enabled() == null) {
			throw new IllegalArgumentException("enabled 값은 필수입니다.");
		}

		ChildProfile child = getRequiredChild(request.childId());
		String normalizedCategoryId = request.categoryId().trim();
		if (!DEFAULT_YOUTUBE_CATEGORY_SETTINGS.containsKey(normalizedCategoryId)) {
			throw new IllegalArgumentException("지원하지 않는 YouTube 카테고리입니다: " + normalizedCategoryId);
		}

		resolveYoutubeCategoryFilters(child.childId());

		ChildYoutubeCategoryFilterRecord next = new ChildYoutubeCategoryFilterRecord();
		next.setChildId(child.childId());
		next.setCategoryId(normalizedCategoryId);
		next.setEnabled(request.enabled());
		parentControlMapper.upsertYoutubeCategoryFilter(next);

		return getYoutubeCategoryFilter(child.childId());
	}

	public List<ParentViewingHistoryResponse> getViewingHistory(
		int familyId,
		Integer childId,
		int limit
	) {
		return parentControlMapper.findViewingHistory(
			familyId,
			childId,
			Math.max(1, Math.min(limit, 50))
		);
	}

	public List<ParentAlertResponse> getAlerts(int familyId, int limit) {
		return parentControlMapper.findAlertsByFamilyId(familyId, Math.max(1, Math.min(limit, 50)));
	}

	public PlaybackDecisionResult buildPlaybackDecision(
		Integer childId,
		String videoId,
		Integer durationSeconds,
		boolean harmful,
		List<String> harmfulReasons,
		boolean shortForm
	) {
		return buildAndPersistPlaybackDecision(
			childId,
			videoId,
			durationSeconds,
			harmful,
			harmfulReasons,
			shortForm
		).playback();
	}

	public PlaybackRecordResponse recordPlaybackFromAnalysis(PlaybackRecordRequest request) {
		if (request.childId() == null) {
			throw new IllegalArgumentException("childId는 필수입니다.");
		}
		if (!StringUtils.hasText(request.videoId())) {
			throw new IllegalArgumentException("videoId는 필수입니다.");
		}

		LoggedPlaybackDecision logged = buildAndPersistPlaybackDecision(
			request.childId(),
			request.videoId(),
			request.durationSeconds(),
			Boolean.TRUE.equals(request.harmful()),
			request.harmfulReasons() == null ? List.of() : request.harmfulReasons(),
			Boolean.TRUE.equals(request.shortForm())
		);

		return new PlaybackRecordResponse(logged.viewingId(), logged.playback());
	}

	private LoggedPlaybackDecision buildAndPersistPlaybackDecision(
		Integer childId,
		String videoId,
		Integer durationSeconds,
		boolean harmful,
		List<String> harmfulReasons,
		boolean shortForm
	) {
		if (childId == null) {
			return new LoggedPlaybackDecision(
				null,
				defaultPlaybackDecision(harmful, harmfulReasons, shortForm)
			);
		}

		ChildProfile child = getRequiredChild(childId);
		ChildWatchPolicyRecord policy = resolvePolicy(child.childId());
		LocalDateTime now = LocalDateTime.now();
		int currentDayLimit = resolveDailyLimitMinutes(policy, now.getDayOfWeek());
		int todayWatchMinutes = defaultInt(parentControlMapper.sumTodayWatchMinutesByChildId(child.childId()));
		int projectedMinutes = todayWatchMinutes + Math.max(1, (durationSeconds == null ? 0 : durationSeconds) / 60);
		boolean allowedNow = isViewingAllowed(policy, now);
		boolean dailyLimitExceeded = projectedMinutes > currentDayLimit;

		int riskScore = 10;
		List<String> behaviorSignals = new ArrayList<>();
		behaviorSignals.add("실시간 행동 분석은 카메라 기반 addiction.py 전체 모드에서 수행됩니다.");

		if (shortForm) {
			riskScore += 12;
			behaviorSignals.add("짧은 영상으로 분류되어 연속 시청 위험도를 가중했습니다.");
		}

		if (harmful) {
			riskScore += 35;
			behaviorSignals.add("유해 콘텐츠 신호가 감지되어 재생 위험도를 높였습니다.");
		}

		if (!allowedNow) {
			riskScore += 22;
			behaviorSignals.add("현재 시간대는 보호자가 허용한 시청 가능 시간을 벗어났습니다.");
		}

		if (dailyLimitExceeded) {
			riskScore += 30;
			behaviorSignals.add("오늘 누적 시청 시간이 일일 허용 시간을 초과할 가능성이 높습니다.");
		} else if (currentDayLimit > 0) {
			int usageRate = Math.min(100, projectedMinutes * 100 / currentDayLimit);
			if (usageRate >= 80) {
				riskScore += 15;
				behaviorSignals.add("오늘 시청 시간이 제한 시간의 80%를 넘어 부모 알림 임계치에 근접했습니다.");
			}
		}

		String riskLevel = riskScore >= 75
			? "위험"
			: riskScore >= 50
				? "경고"
				: riskScore >= 25 ? "주의" : "정상";

		boolean blockedByPolicy = Boolean.TRUE.equals(policy.getAutoBlockEnabled())
			&& (!allowedNow || dailyLimitExceeded);
		boolean allowed = !harmful && !blockedByPolicy;
		String message;
		if (harmful) {
			message = "유해 콘텐츠가 감지되어 재생이 차단되었습니다.";
		} else if (!allowedNow) {
			message = "설정된 시청 가능 시간이 아니라 재생이 차단되었습니다.";
		} else if (dailyLimitExceeded) {
			message = "오늘 시청 허용 시간을 초과하여 재생이 차단되었습니다.";
		} else {
			message = "재생이 허용되었습니다. YouTube로 이동해 시청할 수 있습니다.";
		}

		int estimatedWatchDurationSeconds = estimateWatchDurationSeconds(durationSeconds);
		int viewingId = createViewingRecord(child, videoId, estimatedWatchDurationSeconds);
		createAlertsIfNeeded(
			viewingId,
			policy,
			riskScore,
			harmful,
			allowed,
			harmfulReasons,
			message
		);

		return new LoggedPlaybackDecision(
			viewingId,
			new PlaybackDecisionResult(
				allowed,
				message,
				Math.min(100, riskScore),
				riskLevel,
				behaviorSignals
			)
		);
	}

	private PlaybackDecisionResult defaultPlaybackDecision(
		boolean harmful,
		List<String> harmfulReasons,
		boolean shortForm
	) {
		List<String> behaviorSignals = new ArrayList<>();
		behaviorSignals.add("아동 프로필을 선택하면 시청 시간 제한과 부모 알림 규칙이 함께 적용됩니다.");
		if (shortForm) {
			behaviorSignals.add("짧은 영상은 반복 시청 위험이 있어 추가 주의 대상으로 표기됩니다.");
		}
		if (harmful && harmfulReasons != null && !harmfulReasons.isEmpty()) {
			behaviorSignals.add("유해 신호가 감지되어 보호자 확인 후 재생하는 것이 안전합니다.");
		}

		return new PlaybackDecisionResult(
			!harmful,
			harmful ? "유해 콘텐츠가 감지되어 재생 전 보호자 확인이 필요합니다." : "분석 결과상 즉시 재생 가능합니다.",
			harmful ? 70 : shortForm ? 34 : 18,
			harmful ? "경고" : shortForm ? "주의" : "정상",
			behaviorSignals
		);
	}

	private ParentChildResponse toChildResponse(ChildProfile child) {
		ChildWatchPolicyRecord policy = resolvePolicy(child.childId());
		return new ParentChildResponse(
			child.childId(),
			child.childName(),
			child.birthYear(),
			defaultInt(parentControlMapper.sumTodayWatchMinutesByChildId(child.childId())),
			isViewingAllowed(policy, LocalDateTime.now()),
			toPolicyResponse(policy)
		);
	}

	private ChildWatchPolicyRecord resolvePolicy(int childId) {
		ChildWatchPolicyRecord existing = parentControlMapper.findWatchPolicyByChildId(childId);
		if (existing != null) {
			return existing;
		}

		ChildWatchPolicyRecord fallback = new ChildWatchPolicyRecord();
		fallback.setChildId(childId);
		fallback.setDailyLimitMinutes(120);
		fallback.setWeekdayStartHour(7);
		fallback.setWeekdayEndHour(21);
		fallback.setWeekendStartHour(8);
		fallback.setWeekendEndHour(22);
		fallback.setBedtimeLockEnabled(Boolean.FALSE);
		fallback.setBedtimeHour(21);
		fallback.setMondayLimitMinutes(120);
		fallback.setTuesdayLimitMinutes(120);
		fallback.setWednesdayLimitMinutes(120);
		fallback.setThursdayLimitMinutes(120);
		fallback.setFridayLimitMinutes(120);
		fallback.setSaturdayLimitMinutes(140);
		fallback.setSundayLimitMinutes(140);
		fallback.setNotificationThreshold(70);
		fallback.setAutoBlockEnabled(Boolean.TRUE);
		parentControlMapper.upsertWatchPolicy(fallback);
		return parentControlMapper.findWatchPolicyByChildId(childId);
	}

	private ChildWatchPolicyResponse toPolicyResponse(ChildWatchPolicyRecord record) {
		return new ChildWatchPolicyResponse(
			record.getChildId(),
			record.getDailyLimitMinutes(),
			record.getWeekdayStartHour(),
			record.getWeekdayEndHour(),
			record.getWeekendStartHour(),
			record.getWeekendEndHour(),
			Boolean.TRUE.equals(record.getBedtimeLockEnabled()),
			record.getBedtimeHour(),
			record.getMondayLimitMinutes(),
			record.getTuesdayLimitMinutes(),
			record.getWednesdayLimitMinutes(),
			record.getThursdayLimitMinutes(),
			record.getFridayLimitMinutes(),
			record.getSaturdayLimitMinutes(),
			record.getSundayLimitMinutes(),
			record.getNotificationThreshold(),
			Boolean.TRUE.equals(record.getAutoBlockEnabled()),
			record.getUpdatedAt()
		);
	}

	private List<ChildYoutubeCategoryFilterRecord> resolveYoutubeCategoryFilters(int childId) {
		List<ChildYoutubeCategoryFilterRecord> existing = parentControlMapper.findYoutubeCategoryFiltersByChildId(childId);
		Map<String, Boolean> currentSettings = new LinkedHashMap<>(DEFAULT_YOUTUBE_CATEGORY_SETTINGS);

		for (ChildYoutubeCategoryFilterRecord record : existing) {
			if (record.getCategoryId() != null && currentSettings.containsKey(record.getCategoryId())) {
				currentSettings.put(record.getCategoryId(), Boolean.TRUE.equals(record.getEnabled()));
			}
		}

		if (existing.size() < DEFAULT_YOUTUBE_CATEGORY_SETTINGS.size()) {
			for (Map.Entry<String, Boolean> entry : currentSettings.entrySet()) {
				boolean missing = existing.stream().noneMatch((record) -> entry.getKey().equals(record.getCategoryId()));
				if (!missing) {
					continue;
				}

				ChildYoutubeCategoryFilterRecord fallback = new ChildYoutubeCategoryFilterRecord();
				fallback.setChildId(childId);
				fallback.setCategoryId(entry.getKey());
				fallback.setEnabled(entry.getValue());
				parentControlMapper.upsertYoutubeCategoryFilter(fallback);
			}
			existing = parentControlMapper.findYoutubeCategoryFiltersByChildId(childId);
		}

		return existing;
	}

	private YoutubeCategoryFilterResponse toYoutubeCategoryFilterResponse(
		int childId,
		List<ChildYoutubeCategoryFilterRecord> records
	) {
		Map<String, Boolean> categorySettings = new LinkedHashMap<>(DEFAULT_YOUTUBE_CATEGORY_SETTINGS);
		LocalDateTime updatedAt = null;

		for (ChildYoutubeCategoryFilterRecord record : records) {
			if (record.getCategoryId() != null && categorySettings.containsKey(record.getCategoryId())) {
				categorySettings.put(record.getCategoryId(), Boolean.TRUE.equals(record.getEnabled()));
			}
			if (record.getUpdatedAt() != null && (updatedAt == null || record.getUpdatedAt().isAfter(updatedAt))) {
				updatedAt = record.getUpdatedAt();
			}
		}

		return new YoutubeCategoryFilterResponse(
			childId,
			categorySettings,
			updatedAt
		);
	}

	private boolean isViewingAllowed(ChildWatchPolicyRecord policy, LocalDateTime currentTime) {
		DayOfWeek dayOfWeek = currentTime.getDayOfWeek();
		boolean isWeekend = dayOfWeek == DayOfWeek.SATURDAY || dayOfWeek == DayOfWeek.SUNDAY;
		int start = isWeekend ? defaultInt(policy.getWeekendStartHour()) : defaultInt(policy.getWeekdayStartHour());
		int end = isWeekend ? defaultInt(policy.getWeekendEndHour()) : defaultInt(policy.getWeekdayEndHour());
		if (Boolean.TRUE.equals(policy.getBedtimeLockEnabled()) && policy.getBedtimeHour() != null) {
			end = Math.min(end, policy.getBedtimeHour());
		}
		int hour = currentTime.getHour();
		return hour >= start && hour < end;
	}

	private void validatePolicy(ChildWatchPolicyRecord policy) {
		validateHourRange(policy.getWeekdayStartHour(), policy.getWeekdayEndHour(), "주중");
		validateHourRange(policy.getWeekendStartHour(), policy.getWeekendEndHour(), "주말");

		if (policy.getDailyLimitMinutes() == null
			|| policy.getDailyLimitMinutes() < 10
			|| policy.getDailyLimitMinutes() > 720) {
			throw new IllegalArgumentException("일일 시청 시간은 10분 이상 720분 이하로 설정해야 합니다.");
		}

		if (policy.getBedtimeHour() == null || policy.getBedtimeHour() < 18 || policy.getBedtimeHour() > 23) {
			throw new IllegalArgumentException("취침 시간은 18시 이상 23시 이하로 설정해야 합니다.");
		}

		validateDayLimit(policy.getMondayLimitMinutes(), "월요일");
		validateDayLimit(policy.getTuesdayLimitMinutes(), "화요일");
		validateDayLimit(policy.getWednesdayLimitMinutes(), "수요일");
		validateDayLimit(policy.getThursdayLimitMinutes(), "목요일");
		validateDayLimit(policy.getFridayLimitMinutes(), "금요일");
		validateDayLimit(policy.getSaturdayLimitMinutes(), "토요일");
		validateDayLimit(policy.getSundayLimitMinutes(), "일요일");

		if (policy.getNotificationThreshold() == null
			|| policy.getNotificationThreshold() < 0
			|| policy.getNotificationThreshold() > 100) {
			throw new IllegalArgumentException("알림 임계치는 0 이상 100 이하로 설정해야 합니다.");
		}
	}

	private void validateHourRange(Integer start, Integer end, String label) {
		if (start == null || end == null || start < 0 || start > 23 || end < 1 || end > 24 || start >= end) {
			throw new IllegalArgumentException(label + " 시청 가능 시간 설정이 올바르지 않습니다.");
		}
	}

	private int resolveDailyLimitMinutes(ChildWatchPolicyRecord policy, DayOfWeek dayOfWeek) {
		Integer limit = switch (dayOfWeek) {
			case MONDAY -> policy.getMondayLimitMinutes();
			case TUESDAY -> policy.getTuesdayLimitMinutes();
			case WEDNESDAY -> policy.getWednesdayLimitMinutes();
			case THURSDAY -> policy.getThursdayLimitMinutes();
			case FRIDAY -> policy.getFridayLimitMinutes();
			case SATURDAY -> policy.getSaturdayLimitMinutes();
			case SUNDAY -> policy.getSundayLimitMinutes();
		};
		if (limit != null && limit >= 0) {
			return limit;
		}
		return defaultInt(policy.getDailyLimitMinutes());
	}

	private void validateDayLimit(Integer limitMinutes, String label) {
		if (limitMinutes == null || limitMinutes < 0 || limitMinutes > 240 || limitMinutes % 10 != 0) {
			throw new IllegalArgumentException(label + " 시청 시간은 0분 이상 240분 이하, 10분 단위여야 합니다.");
		}
	}

	private ChildProfile getRequiredChild(int childId) {
		ChildProfile child = parentControlMapper.findChildById(childId);
		if (child == null) {
			throw new IllegalArgumentException("아동 정보를 찾을 수 없습니다.");
		}
		return child;
	}

	private int createViewingRecord(ChildProfile child, String videoId, int watchDurationSeconds) {
		ViewingHistoryWriteRecord record = new ViewingHistoryWriteRecord();
		record.setViewingId(defaultInt(parentControlMapper.nextViewingId()));
		record.setUserId(child.userId());
		record.setChildId(child.childId());
		record.setVideoId(videoId);
		record.setWatchTime(LocalDateTime.now());
		record.setWatchDuration(watchDurationSeconds);
		parentControlMapper.insertViewingHistory(record);
		return record.getViewingId();
	}

	private int estimateWatchDurationSeconds(Integer durationSeconds) {
		if (durationSeconds == null || durationSeconds <= 0) {
			return 60;
		}

		return Math.max(60, durationSeconds);
	}

	private void createAlertsIfNeeded(
		int viewingId,
		ChildWatchPolicyRecord policy,
		int riskScore,
		boolean harmful,
		boolean allowed,
		List<String> harmfulReasons,
		String playbackMessage
	) {
		if (harmful) {
			insertAlert(viewingId, "유해콘텐츠", "높음", firstReason(harmfulReasons, playbackMessage));
		}

		if (!allowed) {
			insertAlert(viewingId, "재생차단", "높음", playbackMessage);
		}

		if (riskScore >= defaultInt(policy.getNotificationThreshold())) {
			insertAlert(
				viewingId,
				"중독위험",
				riskScore >= 80 ? "위험" : "주의",
				"중독 위험 점수 " + riskScore + "점으로 보호자 알림 전송 조건을 충족했습니다."
			);
		}
	}

	private void insertAlert(int viewingId, String alertType, String riskLevel, String messageText) {
		parentControlMapper.insertAlert(
			new AlertLogRecord(
				defaultInt(parentControlMapper.nextAlertId()),
				viewingId,
				alertType,
				riskLevel,
				messageText
			)
		);
	}

	private String firstReason(List<String> harmfulReasons, String fallback) {
		return harmfulReasons == null || harmfulReasons.isEmpty() ? fallback : harmfulReasons.get(0);
	}

	private int defaultInt(Integer value) {
		return value == null ? 0 : value;
	}

	private static Map<String, Boolean> createDefaultYoutubeCategorySettings() {
		Map<String, Boolean> defaults = new LinkedHashMap<>();
		defaults.put("film_animation", true);
		defaults.put("autos_vehicles", true);
		defaults.put("music", true);
		defaults.put("pets_animals", true);
		defaults.put("sports", true);
		defaults.put("travel_events", true);
		defaults.put("gaming", false);
		defaults.put("people_blogs", true);
		defaults.put("comedy", true);
		defaults.put("entertainment", false);
		defaults.put("news_politics", false);
		defaults.put("howto_style", true);
		defaults.put("education", true);
		defaults.put("science_technology", true);
		defaults.put("nonprofits_activism", true);
		return defaults;
	}

	private record LoggedPlaybackDecision(
		Integer viewingId,
		PlaybackDecisionResult playback
	) {
	}
}
