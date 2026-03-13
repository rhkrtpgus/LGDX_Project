package com.example.demo.dto;

import java.time.LocalDateTime;

public class ParentAlertResponse {

	private Integer alertId;
	private Integer viewingId;
	private Integer childId;
	private String childName;
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

	public Integer getViewingId() {
		return viewingId;
	}

	public void setViewingId(Integer viewingId) {
		this.viewingId = viewingId;
	}

	public Integer getChildId() {
		return childId;
	}

	public void setChildId(Integer childId) {
		this.childId = childId;
	}

	public String getChildName() {
		return childName;
	}

	public void setChildName(String childName) {
		this.childName = childName;
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
