package com.example.demo.dto;

import java.time.LocalDateTime;

public class RecentAlertResponse {

	private Integer alertId;
	private String alertType;
	private String riskLevel;
	private String messageText;
	private String videoId;
	private LocalDateTime watchTime;

	public Integer getAlertId() {
		return alertId;
	}

	public void setAlertId(Integer alertId) {
		this.alertId = alertId;
	}

	public String getAlertType() {
		return alertType;
	}

	public void setAlertType(String alertType) {
		this.alertType = alertType;
	}

	public String getRiskLevel() {
		return riskLevel;
	}

	public void setRiskLevel(String riskLevel) {
		this.riskLevel = riskLevel;
	}

	public String getMessageText() {
		return messageText;
	}

	public void setMessageText(String messageText) {
		this.messageText = messageText;
	}

	public String getVideoId() {
		return videoId;
	}

	public void setVideoId(String videoId) {
		this.videoId = videoId;
	}

	public LocalDateTime getWatchTime() {
		return watchTime;
	}

	public void setWatchTime(LocalDateTime watchTime) {
		this.watchTime = watchTime;
	}
}
