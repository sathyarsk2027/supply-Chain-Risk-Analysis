package com.supplychain.monitor.model;

import jakarta.persistence.AttributeConverter;
import jakarta.persistence.Converter;
import org.postgresql.util.PGobject;
import java.sql.SQLException;
import java.util.Arrays;

@Converter(autoApply = false)
public class VectorConverter implements AttributeConverter<float[], PGobject> {

    @Override
    public PGobject convertToDatabaseColumn(float[] attribute) {
        if (attribute == null) {
            return null;
        }
        try {
            PGobject pgobject = new PGobject();
            pgobject.setType("vector");
            pgobject.setValue(Arrays.toString(attribute));
            return pgobject;
        } catch (SQLException e) {
            throw new IllegalArgumentException("Error converting float[] to PGobject vector", e);
        }
    }

    @Override
    public float[] convertToEntityAttribute(PGobject dbData) {
        if (dbData == null || dbData.getValue() == null) {
            return null;
        }
        String value = dbData.getValue();
        if (value.startsWith("[") && value.endsWith("]")) {
            value = value.substring(1, value.length() - 1);
        }
        String[] parts = value.split(",");
        float[] result = new float[parts.length];
        for (int i = 0; i < parts.length; i++) {
            result[i] = Float.parseFloat(parts[i].trim());
        }
        return result;
    }
}
