package com.example.demo.dto;

import java.time.LocalDateTime;
import java.util.List;

public class AnalysisHistoryResponse {

	private Long analysisId;
	private String inputUrl;
	private String videoId;
	private String title;
	private String categoryNameKo;
	private Integer durationSeconds;
	private Boolean shortForm;
	private Boolean blockedByCategory;
	private Boolean hasViolence;
	private Double violenceScore;
	private Integer violencePositiveWindows;
	private Boolean hasNudity;
	private Integer nudityMatchCount;
	private Boolean harmful;
	private String harmfulReasonsJson;
	private String status;
	private String errorMessage;
	private LocalDateTime createdAt;

	public Long getAnalysisId() {
		return analysisId;
	}

	public void setAnalysisId(Long analysisId) {
		this.analysisId = analysisId;
	}

	public String getInputUrl() {
		return inputUrl;
	}

	public void setInputUrl(String inputUrl) {
		this.inputUrl = inputUrl;
	}

	public String getVideoId() {
		return videoId;
	}

	public void setVideoId(String videoId) {
		this.videoId = videoId;
	}

	public String getTitle() {
		return title;
	}

	public void setTitle(String title) {
		this.title = title;
	}

	public String getCategoryNameKo() {
		return categoryNameKo;
	}

	public void setCategoryNameKo(String categoryNameKo) {
		this.categoryNameKo = categoryNameKo;
	}

	public Integer getDurationSeconds() {
		return durationSeconds;
	}

	public void setDurationSeconds(Integer durationSeconds) {
		this.durationSeconds = durationSeconds;
	}

	public Boolean getShortForm() {
		return shortForm;
	}

	public void setShortForm(Boolean shortForm) {
		this.shortForm = shortForm;
	}

	public Boolean getBlockedByCategory() {
		return blockedByCategory;
	}

	public void setBlockedByCategory(Boolean blockedByCategory) {
		this.blockedByCategory = blockedByCategory;
	}

	public Boolean getHasViolence() {
		return hasViolence;
	}

	public void setHasViolence(Boolean hasViolence) {
		this.hasViolence = hasViolence;
	}

	public Double getViolenceScore() {
		return violenceScore;
	}

	public void setViolenceScore(Double violenceScore) {
		this.violenceScore = violenceScore;
	}

	public Integer getViolencePositiveWindows() {
		return violencePositiveWindows;
	}

	public void setViolencePositiveWindows(Integer violencePositiveWindows) {
		this.violencePositiveWindows = violencePositiveWindows;
	}

	public Boolean getHasNudity() {
		return hasNudity;
	}

	public void setHasNudity(Boolean hasNudity) {
		this.hasNudity = hasNudity;
	}

	public Integer getNudityMatchCount() {
		return nudityMatchCount;
	}

	public void setNudityMatchCount(Integer nudityMatchCount) {
		this.nudityMatchCount = nudityMatchCount;
	}

	public Boolean getHarmful() {
		return harmful;
	}

	public void setHarmful(Boolean harmful) {
		this.harmful = harmful;
	}

	public String getHarmfulReasonsJson() {
		return harmfulReasonsJson;
	}

	public void setHarmfulReasonsJson(String harmfulReasonsJson) {
		this.harmfulReasonsJson = harmfulReasonsJson;
	}

	public String getStatus() {
		return status;
	}

	public void setStatus(String status) {
		this.status = status;
	}

	public String getErrorMessage() {
		return errorMessage;
	}

	public void setErrorMessage(String errorMessage) {
		this.errorMessage = errorMessage;
	}

	public LocalDateTime getCreatedAt() {
		return createdAt;
	}

	public void setCreatedAt(LocalDateTime createdAt) {
		this.createdAt = createdAt;
	}

	public AnalysisResponse toResponse(List<String> harmfulReasons) {
		boolean harmfulValue = Boolean.TRUE.equals(harmful);
		boolean shortFormValue = Boolean.TRUE.equals(shortForm);

		return new AnalysisResponse(
			analysisId,
			inputUrl,
			videoId,
			title,
			categoryNameKo,
			durationSeconds,
			shortFormValue,
			Boolean.TRUE.equals(blockedByCategory),
			Boolean.TRUE.equals(hasViolence),
			violenceScore,
			violencePositiveWindows,
			Boolean.TRUE.equals(hasNudity),
			nudityMatchCount,
			harmfulValue,
			harmfulReasons,
			new PlaybackDecisionResult(
				!harmfulValue,
				harmfulValue
					? "이전 분석 결과 기준으로 보호자 확인이 필요한 콘텐츠입니다."
					: "이전 분석 결과 기준으로 즉시 재생 가능한 콘텐츠입니다.",
				harmfulValue ? 70 : shortFormValue ? 34 : 18,
				harmfulValue ? "경고" : shortFormValue ? "주의" : "정상",
				List.of("최근 분석 이력은 저장된 메타데이터 기준으로 다시 표시됩니다.")
			),
			null,
			status,
			errorMessage,
			createdAt
		);
	}
}
