package com.example.demo.domain;

import java.time.LocalDateTime;

public class AnalysisHistoryRecord {

	private Long analysisId;
	private String inputUrl;
	private String videoId;
	private String title;
	private String categoryNameKo;
	private Integer durationSeconds;
	private boolean isShortForm;
	private boolean blockedByCategory;
	private boolean hasViolence;
	private Double violenceScore;
	private Integer violencePositiveWindows;
	private boolean hasNudity;
	private Integer nudityMatchCount;
	private boolean harmful;
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

	public boolean isShortForm() {
		return isShortForm;
	}

	public void setShortForm(boolean shortForm) {
		isShortForm = shortForm;
	}

	public boolean isBlockedByCategory() {
		return blockedByCategory;
	}

	public void setBlockedByCategory(boolean blockedByCategory) {
		this.blockedByCategory = blockedByCategory;
	}

	public boolean isHasViolence() {
		return hasViolence;
	}

	public void setHasViolence(boolean hasViolence) {
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

	public boolean isHasNudity() {
		return hasNudity;
	}

	public void setHasNudity(boolean hasNudity) {
		this.hasNudity = hasNudity;
	}

	public Integer getNudityMatchCount() {
		return nudityMatchCount;
	}

	public void setNudityMatchCount(Integer nudityMatchCount) {
		this.nudityMatchCount = nudityMatchCount;
	}

	public boolean isHarmful() {
		return harmful;
	}

	public void setHarmful(boolean harmful) {
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
}
