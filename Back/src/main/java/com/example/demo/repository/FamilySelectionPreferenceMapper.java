package com.example.demo.repository;

import com.example.demo.domain.FamilySelectionPreferenceRecord;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Param;

@Mapper
public interface FamilySelectionPreferenceMapper {

	FamilySelectionPreferenceRecord findByFamilyId(@Param("familyId") int familyId);

	void upsert(FamilySelectionPreferenceRecord record);
}
